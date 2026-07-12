use axum::extract::{RawQuery, State};
use axum::http::{header, HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use chrono::NaiveDate;

use crate::auth;
use crate::email;
use crate::error::AppError;
use crate::models::{
    BasicUserSetupRequest, DiscoveryFilters, FilteredUserResponse, LikeRequest, LikeResponse,
    LoginRequest, SignUpRequest, UserLocation, UserResponse, VerifyEmailRequest,
    VerifyEmailResponse,
};
use crate::otp;
use crate::repo;
use crate::AppState;

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/signUp", post(sign_up))
        .route("/verifyEmail", post(verify_email))
        .route("/login", post(login))
        .route("/basicUserSetup", post(basic_user_setup))
        .route("/getFilteredData", get(get_filtered_data))
        .route("/likeUser", post(like_user))
        .route("/like", post(like_user))
        .route("/dislikeUser", post(dislike_user))
        .with_state(state)
}

async fn health() -> &'static str {
    "ok"
}

/// POST /signUp  — { email, password }
///
/// Unauthenticated (pre-Auth0 flow). Stores the account password hash, mints a
/// 6-digit OTP, and emails it as a styled (MJML) message. Always responds 200
/// with `{ "sent": true }` to avoid leaking which emails already exist; genuine
/// SMTP/render failures still surface as 502.
async fn sign_up(
    State(state): State<AppState>,
    Json(body): Json<SignUpRequest>,
) -> Result<Response, AppError> {
    let email = body.email.trim().to_lowercase();
    if email.is_empty() || !email.contains('@') {
        return Err(AppError::BadRequest("invalid email".into()));
    }
    if body.password.len() < 8 {
        return Err(AppError::BadRequest(
            "password must be at least 8 characters".into(),
        ));
    }

    // Persist the account password (creates the user row if new).
    let password_hash = otp::hash_secret(&body.password)?;
    repo::set_password(&state.db, &email, &password_hash).await?;

    // Issue + send the OTP.
    let code = otp::issue(&state.db, &email, state.config.otp_ttl_secs).await?;
    email::send_otp(&state.mailer, &state.config, &email, &code).await?;

    tracing::debug!(%email, "sign-up OTP sent");
    Ok((StatusCode::OK, Json(serde_json::json!({ "sent": true }))).into_response())
}

/// POST /verifyEmail  — { email, otpCode }
///
/// Unauthenticated. Checks the OTP (valid for `OTP_TTL_SECS`, default 300s).
/// On success marks the email verified and returns `{ "isSuccess": true }`;
/// otherwise `{ "isSuccess": false }`. Exhausted attempts yield 429.
async fn verify_email(
    State(state): State<AppState>,
    Json(body): Json<VerifyEmailRequest>,
) -> Result<Response, AppError> {
    let email = body.email.trim().to_lowercase();
    if email.is_empty() || !email.contains('@') {
        return Err(AppError::BadRequest("invalid email".into()));
    }

    let is_success = otp::verify(&state.db, &email, body.otp_code.trim()).await?;
    if is_success {
        repo::mark_email_verified(&state.db, &email).await?;
    }

    Ok((StatusCode::OK, Json(VerifyEmailResponse { is_success })).into_response())
}

/// POST /login
///
/// Flow:
///   1. Read the bearer token from the `Authorization` header.
///   2. Validate it locally against the Auth0 JWKS (iss/aud/exp/alg).
///   3. If the token carries an email claim, it must match the body email.
///   4. Get-or-create the user row by email.
///   5. Return the user; echo the still-valid token back in `Authorization`.
async fn login(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<LoginRequest>,
) -> Result<Response, AppError> {
    // 1 + 2. Authenticate.
    let token = auth::extract_bearer(&headers)?;
    let claims = auth::verify_token(&state, &token).await?;
    tracing::debug!(sub = %claims.sub, "authenticated request");

    // 3. Normalize and validate the requested email.
    let email = body.email.trim().to_lowercase();
    if email.is_empty() || !email.contains('@') {
        return Err(AppError::BadRequest("invalid email".into()));
    }

    // A valid token must not be usable to touch a different account. Access
    // tokens usually carry no email claim; when they do, it has to match. When
    // they don't, we rely on the (authenticated) body email.
    if let Some(token_email) = claims.email.as_deref() {
        if !token_email.trim().eq_ignore_ascii_case(&email) {
            return Err(AppError::Forbidden(
                "email does not match the authenticated identity".into(),
            ));
        }
    }

    // 4. Get-or-create and persist the latest supplied device fingerprint.
    let fingerprint = login_fingerprint(&headers, body.fingerprint.as_deref())?;
    let user = repo::get_or_create_user(
        &state.db,
        &email,
        claims.identity_id(),
        fingerprint.as_deref(),
    )
    .await?;
    let payload = UserResponse::from(user);

    // 5. Hand the token back to the client. Local validation does not mint a
    //    fresh token, so this is a pass-through; true rotation would require the
    //    refresh-token grant against Auth0 `/oauth/token`.
    let mut response = (StatusCode::OK, Json(payload)).into_response();
    if let Ok(value) = format!("Bearer {token}").parse() {
        response.headers_mut().insert(header::AUTHORIZATION, value);
    }

    Ok(response)
}

fn login_fingerprint(
    headers: &HeaderMap,
    body_fingerprint: Option<&str>,
) -> Result<Option<String>, AppError> {
    let header_fingerprint = headers
        .get("x-device-fingerprint")
        .map(|value| {
            value
                .to_str()
                .map_err(|_| AppError::BadRequest("invalid X-Device-Fingerprint header".into()))
        })
        .transpose()?;
    let fingerprint = body_fingerprint.or(header_fingerprint).map(str::trim);
    let Some(fingerprint) = fingerprint.filter(|value| !value.is_empty()) else {
        return Ok(None);
    };

    if fingerprint.len() > 512 || fingerprint.chars().any(char::is_control) {
        return Err(AppError::BadRequest(
            "fingerprint must be at most 512 characters and contain no control characters".into(),
        ));
    }

    Ok(Some(fingerprint.to_string()))
}

/// POST /basicUserSetup
///
/// Same JWT auth as /login. Persists the user's basic profile, parsing the
/// `location` / `preferableLocation` strings into `{lat,lng}`, flips `is_new` to
/// false, and returns the saved profile (echoing the token back).
async fn basic_user_setup(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<BasicUserSetupRequest>,
) -> Result<Response, AppError> {
    // Authenticate exactly like /login.
    let token = auth::extract_bearer(&headers)?;
    let claims = auth::verify_token(&state, &token).await?;
    tracing::debug!(sub = %claims.sub, "authenticated basicUserSetup request");

    // Normalize + validate the email, and enforce token/identity match.
    let email = body.email.trim().to_lowercase();
    if email.is_empty() || !email.contains('@') {
        return Err(AppError::BadRequest("invalid email".into()));
    }
    if let Some(token_email) = claims.email.as_deref() {
        if !token_email.trim().eq_ignore_ascii_case(&email) {
            return Err(AppError::Forbidden(
                "email does not match the authenticated identity".into(),
            ));
        }
    }

    // Parse the date. Accept "YYYY-MM-DD", "YYYY/MM/DD", and ISO-8601 datetimes.
    let dob_str = body.date_of_birth.trim();
    let dob_date_part = dob_str.split('T').next().unwrap_or(dob_str);
    let dob_normalized = dob_date_part.replace('/', "-");
    let date_of_birth = NaiveDate::parse_from_str(&dob_normalized, "%Y-%m-%d")
        .map_err(|_| AppError::BadRequest("invalid date_of_birth (expected YYYY-MM-DD)".into()))?;

    // Parse location: accepts "lat,lng" or a plain city name.
    let location: UserLocation = body
        .location
        .parse()
        .map_err(|e| AppError::BadRequest(format!("invalid location: {e}")))?;
    let mut preferable_locations: Vec<String> = body
        .preferable_location
        .iter()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .collect();
    deduplicate(&mut preferable_locations);

    // Persist (upsert) and clear is_new. `isNew` from the body is ignored.
    let user = repo::update_basic_user_setup(
        &state.db,
        &repo::BasicSetup {
            email: email.as_str(),
            name: body.name.trim(),
            lastname: body.lastname.trim(),
            date_of_birth,
            interests: body.interests.as_slice(),
            languages: body.languages.as_slice(),
            location: &location,
            preferable_location: &preferable_locations,
            interested_in: body
                .interested_in
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty()),
            sexual_orientation: body
                .sexual_orientation
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty()),
            job: body
                .job
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty()),
            description: body
                .description
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty()),
        },
    )
    .await?;
    let payload = UserResponse::from(user);

    // Echo the still-valid token back, mirroring /login.
    let mut response = (StatusCode::OK, Json(payload)).into_response();
    if let Ok(value) = format!("Bearer {token}").parse() {
        response.headers_mut().insert(header::AUTHORIZATION, value);
    }

    Ok(response)
}

/// GET /getFilteredData
///
/// Arrays may be sent as repeated query parameters, bracket parameters,
/// JSON arrays, or comma-separated values. Age is an inclusive [min, max]
/// range. Distance is expressed in kilometres and uses the authenticated
/// user's saved location as its origin.
async fn get_filtered_data(
    State(state): State<AppState>,
    headers: HeaderMap,
    RawQuery(raw_query): RawQuery,
) -> Result<Json<Vec<FilteredUserResponse>>, AppError> {
    let token = auth::extract_bearer(&headers)?;
    let claims = auth::verify_token(&state, &token).await?;
    let filters = parse_discovery_filters(raw_query.as_deref())?;

    repo::validate_netherlands_cities(&state.db, &filters.locations).await?;
    let current_location = if let Some(city) = filters.locations.first() {
        Some(
            repo::save_city_location_for_identity(
                &state.db,
                claims.identity_id(),
                claims.email.as_deref(),
                city,
            )
            .await?,
        )
    } else {
        repo::location_for_identity(&state.db, claims.identity_id(), claims.email.as_deref())
            .await?
    };
    let origin = current_location
        .as_ref()
        .and_then(|location| validated_origin(location).ok());

    if filters.distance_km.is_some() && origin.is_none() {
        return Err(AppError::BadRequest(
            "current user location with lat/lng is required for distance filtering".into(),
        ));
    }

    let users = repo::get_filtered_users(
        &state.db,
        &filters,
        claims.identity_id(),
        claims.email.as_deref(),
        origin,
    )
    .await?;

    Ok(Json(
        users
            .into_iter()
            .map(|user| FilteredUserResponse::from_user(user, origin))
            .collect(),
    ))
}

/// POST /likeUser — { "userID": "<target JWT application ID>" }
///
/// The ID appended to the target profile comes exclusively from the verified
/// access-token payload. Repeating the request is idempotent.
async fn like_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<LikeRequest>,
) -> Result<Json<LikeResponse>, AppError> {
    let token = auth::extract_bearer(&headers)?;
    let claims = auth::verify_token(&state, &token).await?;
    let target_user_id = validated_target_user_id(&body.user_id)?;
    let current_identity_id = claims.identity_id().trim();

    if current_identity_id == target_user_id {
        return Err(AppError::BadRequest("a user cannot like themselves".into()));
    }

    repo::like_user(&state.db, target_user_id, current_identity_id).await?;
    Ok(Json(LikeResponse { is_success: true }))
}

/// POST /dislikeUser — { "userID": "<target JWT application ID>" }
///
/// Records the target ID in the current user's `people_dislike` array and
/// suppresses the target from discovery results for the next two hours.
async fn dislike_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<LikeRequest>,
) -> Result<Json<LikeResponse>, AppError> {
    let token = auth::extract_bearer(&headers)?;
    let claims = auth::verify_token(&state, &token).await?;
    let target_user_id = validated_target_user_id(&body.user_id)?;
    let current_identity_id = claims.identity_id().trim();

    if current_identity_id == target_user_id {
        return Err(AppError::BadRequest(
            "a user cannot dislike themselves".into(),
        ));
    }

    repo::dislike_user(&state.db, current_identity_id, target_user_id).await?;
    Ok(Json(LikeResponse { is_success: true }))
}

fn validated_target_user_id(user_id: &str) -> Result<&str, AppError> {
    let user_id = user_id.trim();
    if user_id.is_empty() || user_id.len() > 512 || user_id.chars().any(char::is_control) {
        return Err(AppError::BadRequest("invalid userID".into()));
    }
    Ok(user_id)
}

fn parse_discovery_filters(raw_query: Option<&str>) -> Result<DiscoveryFilters, AppError> {
    let mut filters = DiscoveryFilters::default();
    let mut ages = Vec::new();

    for (key, value) in url::form_urlencoded::parse(raw_query.unwrap_or_default().as_bytes()) {
        let key = key.as_ref();
        let value = value.trim();

        match key {
            "interestedIn" | "interested_in" => {
                if matches!(
                    value.to_ascii_lowercase().as_str(),
                    "both" | "all" | "everyone"
                ) {
                    filters.interested_in = None;
                } else if !value.is_empty() {
                    filters.interested_in = Some(value.to_string());
                }
            }
            "distance" => {
                if !value.is_empty() {
                    filters.distance_km = Some(parse_distance(value)?);
                }
            }
            key if is_array_key(key, "location") => {
                extend_string_values(&mut filters.locations, value)?;
            }
            key if is_array_key(key, "hobbies") => {
                extend_string_values(&mut filters.hobbies, value)?;
            }
            key if is_array_key(key, "sexualOrientation")
                || is_array_key(key, "sexual_orientation") =>
            {
                extend_string_values(&mut filters.sexual_orientations, value)?;
            }
            key if is_array_key(key, "age") => {
                extend_string_values(&mut ages, value)?;
            }
            _ => {}
        }
    }

    deduplicate(&mut filters.locations);
    deduplicate(&mut filters.hobbies);
    deduplicate(&mut filters.sexual_orientations);

    if !ages.is_empty() {
        if ages.len() != 2 {
            return Err(AppError::BadRequest(
                "age must contain exactly [min, max]".into(),
            ));
        }
        let min_age = ages[0]
            .parse::<i32>()
            .map_err(|_| AppError::BadRequest("age values must be integers".into()))?;
        let max_age = ages[1]
            .parse::<i32>()
            .map_err(|_| AppError::BadRequest("age values must be integers".into()))?;
        if !(0..=150).contains(&min_age) || !(0..=150).contains(&max_age) || min_age > max_age {
            return Err(AppError::BadRequest(
                "age must be an ascending range within 0..=150".into(),
            ));
        }
        filters.age = Some((min_age, max_age));
    }

    Ok(filters)
}

fn is_array_key(key: &str, name: &str) -> bool {
    key == name
        || key == format!("{name}[]")
        || key
            .strip_prefix(name)
            .is_some_and(|suffix| suffix.starts_with('[') && suffix.ends_with(']'))
}

fn extend_string_values(values: &mut Vec<String>, raw: &str) -> Result<(), AppError> {
    if raw.is_empty() {
        return Ok(());
    }

    if raw.starts_with('[') {
        let parsed = serde_json::from_str::<Vec<serde_json::Value>>(raw)
            .map_err(|_| AppError::BadRequest("invalid array query parameter".into()))?;
        for value in parsed {
            let value = match value {
                serde_json::Value::String(value) => value,
                serde_json::Value::Number(value) => value.to_string(),
                _ => {
                    return Err(AppError::BadRequest(
                        "array query values must be strings or numbers".into(),
                    ))
                }
            };
            push_non_empty(values, &value);
        }
    } else {
        for value in raw.split(',') {
            push_non_empty(values, value);
        }
    }

    Ok(())
}

fn push_non_empty(values: &mut Vec<String>, value: &str) {
    let value = value.trim();
    if !value.is_empty() {
        values.push(value.to_string());
    }
}

fn deduplicate(values: &mut Vec<String>) {
    let mut seen = std::collections::HashSet::new();
    values.retain(|value| seen.insert(value.to_lowercase()));
}

fn parse_distance(raw: &str) -> Result<f64, AppError> {
    let normalized = raw.trim().to_ascii_lowercase();
    let normalized = normalized.strip_suffix("km").unwrap_or(&normalized).trim();
    let distance = normalized
        .parse::<f64>()
        .map_err(|_| AppError::BadRequest("distance must be a number in kilometres".into()))?;

    if !distance.is_finite() || !(0.0..=20_050.0).contains(&distance) {
        return Err(AppError::BadRequest(
            "distance must be within 0..=20050 kilometres".into(),
        ));
    }
    Ok(distance)
}

fn validated_origin(location: &UserLocation) -> Result<(f64, f64), AppError> {
    let lat = location.lat.ok_or_else(|| {
        AppError::BadRequest(
            "current user location with lat/lng is required for distance filtering".into(),
        )
    })?;
    let lng = location.lng.ok_or_else(|| {
        AppError::BadRequest(
            "current user location with lat/lng is required for distance filtering".into(),
        )
    })?;

    if !lat.is_finite()
        || !lng.is_finite()
        || !(-90.0..=90.0).contains(&lat)
        || !(-180.0..=180.0).contains(&lng)
    {
        return Err(AppError::BadRequest(
            "current user has invalid location coordinates".into(),
        ));
    }

    Ok((lat, lng))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_discovery_arrays_in_common_query_formats() {
        let filters = parse_discovery_filters(Some(
            "interestedIn=women&location[]=Berlin&location[]=Paris&hobbies=music,sport&sexualOrientation=%5B%22straight%22%2C%22bi%22%5D&distance=25km&age[]=21&age[]=35",
        ))
        .unwrap();

        assert_eq!(filters.interested_in.as_deref(), Some("women"));
        assert_eq!(filters.locations, ["Berlin", "Paris"]);
        assert_eq!(filters.hobbies, ["music", "sport"]);
        assert_eq!(filters.sexual_orientations, ["straight", "bi"]);
        assert_eq!(filters.distance_km, Some(25.0));
        assert_eq!(filters.age, Some((21, 35)));
    }

    #[test]
    fn rejects_invalid_age_range() {
        let error = parse_discovery_filters(Some("age=40,20")).unwrap_err();
        assert!(matches!(error, AppError::BadRequest(_)));
    }

    #[test]
    fn interested_in_both_disables_that_filter() {
        let filters = parse_discovery_filters(Some("interestedIn=both")).unwrap();
        assert_eq!(filters.interested_in, None);

        let filters = parse_discovery_filters(Some("interestedIn=everyone")).unwrap();
        assert_eq!(filters.interested_in, None);
    }

    #[test]
    fn login_fingerprint_prefers_body_and_supports_header() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-device-fingerprint",
            "header-fingerprint".parse().unwrap(),
        );

        assert_eq!(
            login_fingerprint(&headers, Some(" body-fingerprint ")).unwrap(),
            Some("body-fingerprint".into())
        );
        assert_eq!(
            login_fingerprint(&headers, None).unwrap(),
            Some("header-fingerprint".into())
        );
    }

    #[test]
    fn login_fingerprint_rejects_oversized_value() {
        let headers = HeaderMap::new();
        let fingerprint = "x".repeat(513);
        assert!(matches!(
            login_fingerprint(&headers, Some(&fingerprint)),
            Err(AppError::BadRequest(_))
        ));
    }

    #[test]
    fn validates_jwt_target_user_id() {
        assert_eq!(
            validated_target_user_id(" auth0|target-user ").unwrap(),
            "auth0|target-user"
        );
        assert!(validated_target_user_id(" ").is_err());
        assert!(validated_target_user_id("bad\nuser").is_err());
    }
}
