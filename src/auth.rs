use axum::http::{header, HeaderMap};
use jsonwebtoken::jwk::{Jwk, JwkSet};
use jsonwebtoken::{Algorithm, DecodingKey, Validation};
use serde::Deserialize;
use tokio::sync::RwLock;

use crate::error::AppError;
use crate::AppState;

/// Claims read off a verified Auth0 access token. Access tokens always carry
/// `sub`/`iss`/`aud`/`exp`; `email` is only present if the API adds it as a
/// (possibly namespaced) custom claim, so it is optional here.
#[derive(Debug, Deserialize)]
pub struct Claims {
    pub sub: String,
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default, rename = "userID", alias = "user_id", alias = "id")]
    pub user_id: Option<String>,
}

impl Claims {
    /// Stable application identity proven by the verified access token.
    /// Custom application IDs take precedence; Auth0's standard `sub` is the
    /// fallback and is always present on a valid token.
    pub fn identity_id(&self) -> &str {
        self.user_id
            .as_deref()
            .filter(|id| !id.trim().is_empty())
            .unwrap_or(&self.sub)
    }
}

/// In-memory JWKS cache. Auth0 rotates signing keys rarely, so we fetch once
/// and refresh only on a `kid` miss — that covers rotation without making a
/// network call on every request.
pub struct JwksCache {
    url: String,
    set: RwLock<JwkSet>,
}

impl JwksCache {
    pub fn new(url: String) -> Self {
        Self {
            url,
            set: RwLock::new(JwkSet { keys: Vec::new() }),
        }
    }

    pub async fn refresh(&self, http: &reqwest::Client) -> Result<(), AppError> {
        let set = http
            .get(&self.url)
            .send()
            .await
            .map_err(|e| AppError::Auth0(e.to_string()))?
            .error_for_status()
            .map_err(|e| AppError::Auth0(e.to_string()))?
            .json::<JwkSet>()
            .await
            .map_err(|e| AppError::Auth0(format!("invalid JWKS payload: {e}")))?;
        *self.set.write().await = set;
        Ok(())
    }

    /// Find the JWK for `kid`, refreshing from the network once on a miss.
    async fn key_for(&self, kid: &str, http: &reqwest::Client) -> Result<Jwk, AppError> {
        if let Some(jwk) = self.set.read().await.find(kid) {
            return Ok(jwk.clone());
        }
        self.refresh(http).await?;
        self.set
            .read()
            .await
            .find(kid)
            .cloned()
            .ok_or(AppError::Unauthorized)
    }
}

/// Pull the bearer token out of the `Authorization` header.
pub fn extract_bearer(headers: &HeaderMap) -> Result<String, AppError> {
    let value = headers
        .get(header::AUTHORIZATION)
        .ok_or(AppError::MissingToken)?
        .to_str()
        .map_err(|_| AppError::MissingToken)?;

    let token = value
        .strip_prefix("Bearer ")
        .or_else(|| value.strip_prefix("bearer "))
        .unwrap_or(value)
        .trim();

    if token.is_empty() {
        return Err(AppError::MissingToken);
    }
    Ok(token.to_string())
}

/// Verify an Auth0 access token locally: RS/ES signature against the tenant
/// JWKS, plus `iss`, `aud`, `exp` and the expected signing algorithm.
pub async fn verify_token(state: &AppState, token: &str) -> Result<Claims, AppError> {
    let header = jsonwebtoken::decode_header(token).map_err(|e| {
        tracing::warn!(
            error = %e,
            "token is not a well-formed JWT (opaque access token? the client must request the token with the configured `audience`)"
        );
        AppError::Unauthorized
    })?;
    let kid = match header.kid {
        Some(kid) => kid,
        None => {
            tracing::warn!(alg = ?header.alg, "JWT header has no `kid`; cannot select a JWKS key");
            return Err(AppError::Unauthorized);
        }
    };

    let jwk = match state.jwks.key_for(&kid, &state.http).await {
        Ok(jwk) => jwk,
        Err(AppError::Unauthorized) => {
            tracing::warn!(%kid, "no JWKS key matches the token `kid` (even after refresh); token signed by an unknown key / wrong tenant");
            return Err(AppError::Unauthorized);
        }
        Err(e) => return Err(e),
    };
    let key =
        DecodingKey::from_jwk(&jwk).map_err(|e| AppError::Auth0(format!("invalid JWK: {e}")))?;

    let mut validation = Validation::new(parse_alg(&state.config.token_signing_alg)?);
    validation.set_issuer(&state.config.issuers());
    validation.set_audience(&[state.config.audience.as_str()]);

    let data = jsonwebtoken::decode::<Claims>(token, &key, &validation).map_err(|e| {
        tracing::warn!(
            error = %e,
            kind = ?e.kind(),
            expected_iss = ?state.config.issuers(),
            expected_aud = %state.config.audience,
            expected_alg = %state.config.token_signing_alg,
            "Auth0 token rejected during validation"
        );
        AppError::Unauthorized
    })?;
    Ok(data.claims)
}

fn parse_alg(s: &str) -> Result<Algorithm, AppError> {
    Ok(match s.trim().to_ascii_uppercase().as_str() {
        "RS256" => Algorithm::RS256,
        "RS384" => Algorithm::RS384,
        "RS512" => Algorithm::RS512,
        "PS256" => Algorithm::PS256,
        "PS384" => Algorithm::PS384,
        "PS512" => Algorithm::PS512,
        "ES256" => Algorithm::ES256,
        "ES384" => Algorithm::ES384,
        other => {
            return Err(AppError::Auth0(format!(
                "unsupported tokenSigningAlg: {other}"
            )))
        }
    })
}
