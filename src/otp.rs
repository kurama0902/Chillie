//! One-time-code generation, hashing and verification for the email sign-up
//! flow. Codes are 6 digits, stored only as an argon2 hash in `email_otps`,
//! and consumed on the first correct guess. A per-code attempt cap blunts
//! brute force within the short (default 300s) lifetime.

use argon2::password_hash::{
    rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString,
};
use argon2::Argon2;
use chrono::{DateTime, Duration, Utc};
use rand::Rng;
use sqlx::PgPool;

use crate::error::AppError;

/// Wrong guesses tolerated before a code is rejected outright (429).
const MAX_ATTEMPTS: i32 = 5;

/// Generate a zero-padded 6-digit code, e.g. `"042317"`.
pub fn generate_code() -> String {
    let n: u32 = rand::thread_rng().gen_range(0..1_000_000);
    format!("{n:06}")
}

/// argon2 hash of an arbitrary secret (OTP or password). Shared so both use the
/// same KDF and parameters.
pub fn hash_secret(secret: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(secret.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| AppError::Internal(format!("hashing failed: {e}")))
}

fn verify_secret(secret: &str, hash: &str) -> bool {
    match PasswordHash::new(hash) {
        Ok(parsed) => Argon2::default()
            .verify_password(secret.as_bytes(), &parsed)
            .is_ok(),
        Err(_) => false,
    }
}

/// Generate a fresh code for `email`, persist its hash with a `ttl_secs`
/// expiry (replacing any prior code), and return the plaintext code so the
/// caller can email it.
pub async fn issue(pool: &PgPool, email: &str, ttl_secs: i64) -> Result<String, AppError> {
    let code = generate_code();
    let code_hash = hash_secret(&code)?;
    let expires_at: DateTime<Utc> = Utc::now() + Duration::seconds(ttl_secs);

    sqlx::query(
        "INSERT INTO email_otps (email, code_hash, expires_at, attempts, created_at) \
         VALUES ($1, $2, $3, 0, now()) \
         ON CONFLICT (email) DO UPDATE SET \
             code_hash = EXCLUDED.code_hash, \
             expires_at = EXCLUDED.expires_at, \
             attempts = 0, \
             created_at = now()",
    )
    .bind(email)
    .bind(&code_hash)
    .bind(expires_at)
    .execute(pool)
    .await?;

    Ok(code)
}

/// Check `code` against the stored OTP for `email`.
///
/// - Correct & unexpired: the code is consumed (row deleted) and `Ok(true)`.
/// - Wrong / expired / no code: `Ok(false)` (expired codes are cleaned up).
/// - Too many wrong guesses: `Err(TooManyRequests)` (429).
pub async fn verify(pool: &PgPool, email: &str, code: &str) -> Result<bool, AppError> {
    let row = sqlx::query_as::<_, (String, DateTime<Utc>, i32)>(
        "SELECT code_hash, expires_at, attempts FROM email_otps WHERE email = $1",
    )
    .bind(email)
    .fetch_optional(pool)
    .await?;

    let Some((code_hash, expires_at, attempts)) = row else {
        return Ok(false);
    };

    if expires_at <= Utc::now() {
        sqlx::query("DELETE FROM email_otps WHERE email = $1")
            .bind(email)
            .execute(pool)
            .await?;
        return Ok(false);
    }

    if attempts >= MAX_ATTEMPTS {
        return Err(AppError::TooManyRequests(
            "too many attempts, request a new code".into(),
        ));
    }

    if verify_secret(code, &code_hash) {
        sqlx::query("DELETE FROM email_otps WHERE email = $1")
            .bind(email)
            .execute(pool)
            .await?;
        Ok(true)
    } else {
        sqlx::query("UPDATE email_otps SET attempts = attempts + 1 WHERE email = $1")
            .bind(email)
            .execute(pool)
            .await?;
        Ok(false)
    }
}
