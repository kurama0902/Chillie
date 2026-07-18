use axum::body::Bytes;
use axum::extract::{DefaultBodyLimit, Multipart, RawQuery, State};
use axum::http::{header, HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use chrono::NaiveDate;
use std::path::Path;
use tower_http::services::ServeDir;

use crate::auth;
use crate::email;
use crate::error::AppError;
use crate::models::{
    AvatarResponse, BasicUserSetupRequest, DiscoveryFilters, FilteredUserResponse, LikeRequest,
    LikeResponse, LoginRequest, SignUpRequest, UserLocation, UserResponse, VerifyEmailRequest,
    VerifyEmailResponse,
};
use crate::otp;
use crate::repo;
use crate::AppState;

const MAX_AVATAR_BYTES: usize = 8 * 1024 * 1024;
const MAX_MULTIPART_BYTES: usize = MAX_AVATAR_BYTES + 1024 * 1024;

pub fn router(state: AppState) -> Router {
    let upload_dir = state.config.upload_dir.clone();
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
        .route("/updateAvatar", post(update_avatar))
        .nest_service("/uploads", ServeDir::new(upload_dir))
        .layer(DefaultBodyLimit::max(MAX_MULTIPART_BYTES))
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
    multipart: Multipart,
) -> Result<Response, AppError> {
    // Authenticate exactly like /login.
    let token = auth::extract_bearer(&headers)?;
    let claims = auth::verify_token(&state, &token).await?;
    tracing::debug!(sub = %claims.sub, "authenticated basicUserSetup request");

    let (body, avatar_image) = parse_basic_user_setup_form(multipart).await?;

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
            user_id: claims.identity_id(),
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
    let mut payload = UserResponse::from(user);

    if let Some(image) = avatar_image {
        payload.avatar_url = store_avatar_for_identity(&state, claims.identity_id(), image).await?;
    }

    // Echo the still-valid token back, mirroring /login.
    let mut response = (StatusCode::OK, Json(payload)).into_response();
    if let Ok(value) = format!("Bearer {token}").parse() {
        response.headers_mut().insert(header::AUTHORIZATION, value);
    }

    Ok(response)
}

#[derive(Default)]
struct BasicUserSetupForm {
    name: Option<String>,
    lastname: Option<String>,
    email: Option<String>,
    date_of_birth: Option<String>,
    interests: Vec<String>,
    languages: Vec<String>,
    location: Option<String>,
    preferable_location: Vec<String>,
    interested_in: Option<String>,
    sexual_orientation: Option<String>,
    job: Option<String>,
    description: Option<String>,
}

async fn parse_basic_user_setup_form(
    mut multipart: Multipart,
) -> Result<(BasicUserSetupRequest, Option<Bytes>), AppError> {
    let mut form = BasicUserSetupForm::default();
    let mut avatar_image = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("invalid multipart body: {e}")))?
    {
        let Some(name) = field.name().map(str::to_string) else {
            continue;
        };

        if matches!(name.as_str(), "avatar_image" | "avatarImage") {
            let bytes = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(format!("invalid avatar_image field: {e}")))?;
            validate_avatar_bytes(&bytes)?;
            avatar_image = Some(bytes);
            continue;
        }

        let value = field
            .text()
            .await
            .map_err(|e| AppError::BadRequest(format!("invalid {name} field: {e}")))?;
        apply_basic_user_setup_field(&mut form, &name, &value)?;
    }

    deduplicate(&mut form.interests);
    deduplicate(&mut form.languages);
    deduplicate(&mut form.preferable_location);

    Ok((
        BasicUserSetupRequest {
            name: required_form_field(form.name, "name")?,
            lastname: required_form_field(form.lastname, "lastname")?,
            email: required_form_field(form.email, "email")?,
            date_of_birth: required_form_field(form.date_of_birth, "date_of_birth")?,
            interests: form.interests,
            languages: form.languages,
            location: required_form_field(form.location, "location")?,
            preferable_location: form.preferable_location,
            is_new: false,
            interested_in: form.interested_in,
            sexual_orientation: form.sexual_orientation,
            job: form.job,
            description: form.description,
        },
        avatar_image,
    ))
}

fn apply_basic_user_setup_field(
    form: &mut BasicUserSetupForm,
    name: &str,
    value: &str,
) -> Result<(), AppError> {
    match name {
        "name" => form.name = Some(value.to_string()),
        "lastname" => form.lastname = Some(value.to_string()),
        "email" => form.email = Some(value.to_string()),
        "date_of_birth" | "dateOfBirth" => form.date_of_birth = Some(value.to_string()),
        "location" => form.location = Some(value.to_string()),
        "interestedIn" | "interested_in" => form.interested_in = Some(value.to_string()),
        "sexualOrientation" | "sexual_orientation" => {
            form.sexual_orientation = Some(value.to_string())
        }
        "job" => form.job = Some(value.to_string()),
        "description" => form.description = Some(value.to_string()),
        key if is_array_key(key, "interests") || is_array_key(key, "hobbies") => {
            extend_string_values(&mut form.interests, value)?;
        }
        key if is_array_key(key, "languages") => {
            extend_string_values(&mut form.languages, value)?;
        }
        key if is_array_key(key, "preferableLocation")
            || is_array_key(key, "preferable_location") =>
        {
            extend_string_values(&mut form.preferable_location, value)?;
        }
        _ => {}
    }

    Ok(())
}

fn required_form_field(value: Option<String>, name: &str) -> Result<String, AppError> {
    value.ok_or_else(|| AppError::BadRequest(format!("multipart field {name} is required")))
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

/// POST /updateAvatar
///
/// Accepts multipart/form-data with an `avatar`, `image`, or `file` field.
async fn update_avatar(
    State(state): State<AppState>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<Json<AvatarResponse>, AppError> {
    let token = auth::extract_bearer(&headers)?;
    let claims = auth::verify_token(&state, &token).await?;
    let mut image = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("invalid multipart body: {e}")))?
    {
        if !matches!(field.name(), Some("avatar" | "image" | "file")) {
            continue;
        }
        let bytes = field
            .bytes()
            .await
            .map_err(|e| AppError::BadRequest(format!("invalid image field: {e}")))?;
        validate_avatar_bytes(&bytes)?;
        image = Some(bytes);
        break;
    }

    let image = image.ok_or_else(|| {
        AppError::BadRequest("multipart field avatar, image, or file is required".into())
    })?;
    let avatar_url = store_avatar_for_identity(&state, claims.identity_id(), image).await?;

    Ok(Json(AvatarResponse { avatar_url }))
}

fn validate_avatar_bytes(image: &[u8]) -> Result<(), AppError> {
    if image.is_empty() || image.len() > MAX_AVATAR_BYTES {
        return Err(AppError::BadRequest(
            "avatar must be between 1 byte and 8 MB".into(),
        ));
    }
    infer::get(image)
        .filter(|kind| is_supported_avatar_mime(kind.mime_type()))
        .ok_or_else(|| {
            AppError::BadRequest("avatar must be JPEG, PNG, WebP, GIF, HEIC, or HEIF".into())
        })?;
    Ok(())
}

async fn store_avatar_for_identity(
    state: &AppState,
    identity_id: &str,
    image: Bytes,
) -> Result<String, AppError> {
    validate_avatar_bytes(&image)?;
    let kind = infer::get(&image).expect("validated avatar type must remain detectable");

    let id = uuid::Uuid::new_v4();
    let filename = format!("{id}.{}", kind.extension());
    let temporary_path = state.config.upload_dir.join(format!(".{id}.uploading"));
    let final_path = state.config.upload_dir.join(&filename);

    tokio::fs::write(&temporary_path, &image)
        .await
        .map_err(|e| AppError::Internal(format!("could not write avatar: {e}")))?;
    if let Err(error) = tokio::fs::rename(&temporary_path, &final_path).await {
        let _ = tokio::fs::remove_file(&temporary_path).await;
        return Err(AppError::Internal(format!(
            "could not finalize avatar: {error}"
        )));
    }

    let avatar_url = state.config.avatar_url(&filename);
    let previous = match repo::update_avatar_url(&state.db, identity_id, &avatar_url).await {
        Ok(previous) => previous,
        Err(error) => {
            let _ = tokio::fs::remove_file(&final_path).await;
            return Err(error);
        }
    };

    if let Some(previous) = previous {
        remove_previous_local_avatar(state, &previous).await;
    }

    Ok(avatar_url)
}

fn is_supported_avatar_mime(mime: &str) -> bool {
    matches!(
        mime,
        "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "image/heic" | "image/heif"
    )
}

async fn remove_previous_local_avatar(state: &AppState, avatar_url: &str) {
    let Some((_, filename)) = avatar_url.rsplit_once("/uploads/") else {
        return;
    };
    if filename.is_empty()
        || Path::new(filename)
            .file_name()
            .and_then(|name| name.to_str())
            != Some(filename)
    {
        return;
    }
    let _ = tokio::fs::remove_file(state.config.upload_dir.join(filename)).await;
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
            key if is_array_key(key, "location")
                || is_array_key(key, "preferableLocation")
                || is_array_key(key, "preferable_location") =>
            {
                extend_string_values(&mut filters.locations, value)?;
            }
            key if is_array_key(key, "hobbies") || is_array_key(key, "interests") => {
                extend_string_values(&mut filters.hobbies, value)?;
            }
            key if is_array_key(key, "languages") => {
                extend_string_values(&mut filters.languages, value)?;
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
    deduplicate(&mut filters.languages);
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
            "interestedIn=both&distance=40&age[]=18&age[]=96&sexualOrientation=Straight&interests[]=Animation&languages[]=English&preferableLocation[]=Amsterdam",
        ))
        .unwrap();

        assert_eq!(filters.interested_in, None);
        assert_eq!(filters.locations, ["Amsterdam"]);
        assert_eq!(filters.hobbies, ["Animation"]);
        assert_eq!(filters.languages, ["English"]);
        assert_eq!(filters.sexual_orientations, ["Straight"]);
        assert_eq!(filters.distance_km, Some(40.0));
        assert_eq!(filters.age, Some((18, 96)));
    }

    #[test]
    fn keeps_legacy_discovery_filter_names_compatible() {
        let filters = parse_discovery_filters(Some(
            "location[]=Berlin&location[]=Paris&hobbies=music,sport",
        ))
        .unwrap();

        assert_eq!(filters.locations, ["Berlin", "Paris"]);
        assert_eq!(filters.hobbies, ["music", "sport"]);
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

    #[test]
    fn accepts_only_supported_avatar_mime_types() {
        assert!(is_supported_avatar_mime("image/jpeg"));
        assert!(is_supported_avatar_mime("image/png"));
        assert!(is_supported_avatar_mime("image/heic"));
        assert!(!is_supported_avatar_mime("image/svg+xml"));
        assert!(!is_supported_avatar_mime("application/pdf"));
    }

    #[test]
    fn maps_basic_setup_form_fields_and_arrays() {
        let mut form = BasicUserSetupForm::default();
        apply_basic_user_setup_field(&mut form, "sexualOrientation", "bisexual").unwrap();
        apply_basic_user_setup_field(&mut form, "interests[]", "Acting").unwrap();
        apply_basic_user_setup_field(&mut form, "hobbies", "Travel,Cooking").unwrap();
        apply_basic_user_setup_field(
            &mut form,
            "preferableLocation",
            r#"["Amsterdam","Utrecht"]"#,
        )
        .unwrap();

        assert_eq!(form.sexual_orientation.as_deref(), Some("bisexual"));
        assert_eq!(form.interests, ["Acting", "Travel", "Cooking"]);
        assert_eq!(form.preferable_location, ["Amsterdam", "Utrecht"]);
    }
}
