use chrono::NaiveDate;
use sqlx::types::Json;
use sqlx::{PgPool, Postgres, QueryBuilder};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{DiscoveryFilters, UserLocation, UserRow};

const USER_COLUMNS: &str = "user_id, name, lastname, email, date_of_birth, \
     profile_photos, interests, languages, location, preferable_location, is_new, \
     job, description";

/// Return the user for `email`, inserting a bare record (email only, the rest
/// NULL) the first time we see them. The upsert makes this atomic and
/// race-free: `DO UPDATE` (rather than `DO NOTHING`) guarantees `RETURNING`
/// yields the row whether it was just inserted or already existed.
pub async fn get_or_create_user(
    pool: &PgPool,
    email: &str,
    identity_id: &str,
    fingerprint: Option<&str>,
) -> Result<UserRow, AppError> {
    let sql = format!(
        "INSERT INTO users (email, user_id, fingerprint) VALUES ($1, $2, $3) \
         ON CONFLICT (email) DO UPDATE SET \
             user_id = EXCLUDED.user_id, \
             fingerprint = COALESCE(EXCLUDED.fingerprint, users.fingerprint), \
             updated_at = now() \
         RETURNING {USER_COLUMNS}"
    );

    let user = sqlx::query_as::<_, UserRow>(&sql)
        .bind(email)
        .bind(identity_id)
        .bind(fingerprint)
        .fetch_one(pool)
        .await?;

    Ok(user)
}

/// Upsert the account password hash for `email`, creating a bare user row if
/// this is a brand-new sign-up. Idempotent: re-running /signUp just overwrites
/// the hash (and resets `updated_at`).
pub async fn set_password(pool: &PgPool, email: &str, password_hash: &str) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) \
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, \
         updated_at = now()",
    )
    .bind(email)
    .bind(password_hash)
    .execute(pool)
    .await?;

    Ok(())
}

/// Mark `email` as verified once its OTP has checked out.
pub async fn mark_email_verified(pool: &PgPool, email: &str) -> Result<(), AppError> {
    sqlx::query("UPDATE users SET email_verified = true, updated_at = now() WHERE email = $1")
        .bind(email)
        .execute(pool)
        .await?;

    Ok(())
}

/// Borrowed inputs for `update_basic_user_setup`.
pub struct BasicSetup<'a> {
    pub email: &'a str,
    pub name: &'a str,
    pub lastname: &'a str,
    pub date_of_birth: NaiveDate,
    pub interests: &'a [String],
    pub languages: &'a [String],
    pub location: &'a UserLocation,
    pub preferable_location: Option<&'a UserLocation>,
    pub interested_in: Option<&'a str>,
    pub sexual_orientation: Option<&'a str>,
    pub job: Option<&'a str>,
    pub description: Option<&'a str>,
}

/// Write the user's basic profile and clear `is_new`. Upsert by email so the call
/// is idempotent and works even if the row does not exist yet; `RETURNING` yields
/// the full row either way.
pub async fn update_basic_user_setup(
    pool: &PgPool,
    input: &BasicSetup<'_>,
) -> Result<UserRow, AppError> {
    let sql = format!(
        "INSERT INTO users \
             (email, name, lastname, date_of_birth, interests, languages, \
              location, preferable_location, interested_in, sexual_orientation, \
              job, description, is_new, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, now()) \
         ON CONFLICT (email) DO UPDATE SET \
             name = EXCLUDED.name, \
             lastname = EXCLUDED.lastname, \
             date_of_birth = EXCLUDED.date_of_birth, \
             interests = EXCLUDED.interests, \
             languages = EXCLUDED.languages, \
             location = EXCLUDED.location, \
             preferable_location = EXCLUDED.preferable_location, \
             interested_in = COALESCE(EXCLUDED.interested_in, users.interested_in), \
             sexual_orientation = COALESCE(EXCLUDED.sexual_orientation, users.sexual_orientation), \
             job = COALESCE(EXCLUDED.job, users.job), \
             description = COALESCE(EXCLUDED.description, users.description), \
             is_new = false, \
             updated_at = now() \
         RETURNING {USER_COLUMNS}"
    );

    let user = sqlx::query_as::<_, UserRow>(&sql)
        .bind(input.email)
        .bind(input.name)
        .bind(input.lastname)
        .bind(input.date_of_birth)
        .bind(input.interests)
        .bind(input.languages)
        .bind(Json(input.location))
        .bind(input.preferable_location.map(Json))
        .bind(input.interested_in)
        .bind(input.sexual_orientation)
        .bind(input.job)
        .bind(input.description)
        .fetch_one(pool)
        .await?;

    Ok(user)
}

/// Resolve the current user's saved location from the JWT identity, then fall
/// back to the verified token email for users who have not logged in since the
/// `user_id` migration.
pub async fn location_for_identity(
    pool: &PgPool,
    identity_id: &str,
    email: Option<&str>,
) -> Result<Option<UserLocation>, AppError> {
    let location = sqlx::query_scalar::<_, Option<Json<UserLocation>>>(
        "SELECT location FROM users WHERE user_id = $1",
    )
    .bind(identity_id)
    .fetch_optional(pool)
    .await?
    .flatten()
    .map(|json| json.0);

    if location.is_some() {
        return Ok(location);
    }

    let Some(email) = email else {
        return Ok(None);
    };

    let location = sqlx::query_scalar::<_, Option<Json<UserLocation>>>(
        "SELECT location FROM users WHERE email = $1",
    )
    .bind(email.trim().to_lowercase())
    .fetch_optional(pool)
    .await?
    .flatten()
    .map(|json| json.0);

    Ok(location)
}

/// Return discovery profiles matching all supplied filters.
pub async fn get_filtered_users(
    pool: &PgPool,
    filters: &DiscoveryFilters,
    current_identity_id: &str,
    current_email: Option<&str>,
    origin: Option<(f64, f64)>,
) -> Result<Vec<UserRow>, AppError> {
    let mut query = QueryBuilder::<Postgres>::new(format!(
        "SELECT {USER_COLUMNS} FROM users WHERE user_id IS NOT NULL"
    ));

    query
        .push(" AND user_id <> ")
        .push_bind(current_identity_id.to_string());
    query
        .push(" AND NOT EXISTS (SELECT 1 FROM user_dislikes ud WHERE ")
        .push("ud.actor_user_id = (SELECT actor.id FROM users actor WHERE actor.user_id = ")
        .push_bind(current_identity_id.to_string())
        .push(") AND ud.target_user_id = users.id ")
        .push("AND ud.disliked_at > now() - INTERVAL '2 hours')");

    if let Some(email) = current_email {
        query
            .push(" AND email <> ")
            .push_bind(email.trim().to_lowercase());
    }

    if let Some(interested_in) = filters.interested_in.as_deref() {
        query
            .push(" AND LOWER(COALESCE(interested_in, '')) = ")
            .push_bind(interested_in.to_lowercase());
    }

    if !filters.locations.is_empty() {
        let values = lowercase_values(&filters.locations);
        query
            .push(" AND (LOWER(COALESCE(location->>'city', '')) = ANY(")
            .push_bind(values.clone())
            .push(") OR LOWER(COALESCE(location->>'country', '')) = ANY(")
            .push_bind(values)
            .push("))");
    }

    if !filters.hobbies.is_empty() {
        query
            .push(" AND EXISTS (SELECT 1 FROM unnest(COALESCE(interests, ARRAY[]::TEXT[])) AS hobby WHERE LOWER(hobby) = ANY(")
            .push_bind(lowercase_values(&filters.hobbies))
            .push("))");
    }

    if !filters.sexual_orientations.is_empty() {
        query
            .push(" AND LOWER(COALESCE(sexual_orientation, '')) = ANY(")
            .push_bind(lowercase_values(&filters.sexual_orientations))
            .push(")");
    }

    if let Some((min_age, max_age)) = filters.age {
        query
            .push(" AND date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM age(CURRENT_DATE, date_of_birth))::INT BETWEEN ")
            .push_bind(min_age)
            .push(" AND ")
            .push_bind(max_age);
    }

    if let (Some(distance_km), Some((lat, lng))) = (filters.distance_km, origin) {
        query
            .push(" AND location ? 'lat' AND location ? 'lng'")
            .push(" AND jsonb_typeof(location->'lat') = 'number'")
            .push(" AND jsonb_typeof(location->'lng') = 'number'")
            .push(" AND 6371.0 * ACOS(LEAST(1.0, GREATEST(-1.0, ")
            .push("COS(RADIANS(")
            .push_bind(lat)
            .push(")) * COS(RADIANS((location->>'lat')::DOUBLE PRECISION)) * ")
            .push("COS(RADIANS((location->>'lng')::DOUBLE PRECISION) - RADIANS(")
            .push_bind(lng)
            .push(")) + SIN(RADIANS(")
            .push_bind(lat)
            .push(")) * SIN(RADIANS((location->>'lat')::DOUBLE PRECISION))")
            .push("))) <= ")
            .push_bind(distance_km);
    }

    query.push(" ORDER BY updated_at DESC LIMIT 100");

    Ok(query.build_query_as::<UserRow>().fetch_all(pool).await?)
}

/// Add the verified current identity to the target profile's inbound likes.
pub async fn like_user(
    pool: &PgPool,
    target_user_id: &str,
    current_identity_id: &str,
) -> Result<(), AppError> {
    let updated = sqlx::query_scalar::<_, Uuid>(
        "UPDATE users SET \
             people_liked = CASE \
                 WHEN $2 = ANY(people_liked) THEN people_liked \
                 ELSE array_append(people_liked, $2) \
             END, \
             updated_at = now() \
         WHERE user_id = $1 \
         RETURNING id",
    )
    .bind(target_user_id)
    .bind(current_identity_id)
    .fetch_optional(pool)
    .await?;

    if updated.is_none() {
        return Err(AppError::NotFound("user not found".into()));
    }

    Ok(())
}

/// Record an outbound dislike for the current JWT identity. The profile array
/// stores the target application ID, while `user_dislikes` stores the timestamp
/// used by discovery's two-hour exclusion window.
pub async fn dislike_user(
    pool: &PgPool,
    current_identity_id: &str,
    target_user_id: &str,
) -> Result<(), AppError> {
    let mut tx = pool.begin().await?;

    let actor_id = sqlx::query_scalar::<_, Uuid>("SELECT id FROM users WHERE user_id = $1")
        .bind(current_identity_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::NotFound("current user not found; login first".into()))?;
    let target_id = sqlx::query_scalar::<_, Uuid>("SELECT id FROM users WHERE user_id = $1")
        .bind(target_user_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::NotFound("user not found".into()))?;

    sqlx::query(
        "UPDATE users SET \
             people_dislike = CASE \
                 WHEN $2 = ANY(people_dislike) THEN people_dislike \
                 ELSE array_append(people_dislike, $2) \
             END, \
             updated_at = now() \
         WHERE id = $1",
    )
    .bind(actor_id)
    .bind(target_user_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        "INSERT INTO user_dislikes (actor_user_id, target_user_id, disliked_at) \
         VALUES ($1, $2, now()) \
         ON CONFLICT (actor_user_id, target_user_id) DO UPDATE SET disliked_at = now()",
    )
    .bind(actor_id)
    .bind(target_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(())
}

fn lowercase_values(values: &[String]) -> Vec<String> {
    values.iter().map(|value| value.to_lowercase()).collect()
}
