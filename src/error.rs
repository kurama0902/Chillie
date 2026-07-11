use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;

/// Every error that can leave a handler. `IntoResponse` maps each variant to a
/// status code + JSON body, so handlers can just `?` their way through.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("missing or malformed Authorization header")]
    MissingToken,

    #[error("invalid or expired token")]
    Unauthorized,

    #[error("{0}")]
    Forbidden(String),

    #[error("{0}")]
    BadRequest(String),

    #[error("{0}")]
    NotFound(String),

    /// Too many OTP attempts for one code.
    #[error("{0}")]
    TooManyRequests(String),

    /// Auth0 was unreachable or returned something unexpected.
    #[error("auth provider error: {0}")]
    Auth0(String),

    /// Outbound email (SMTP / template render) failed.
    #[error("email delivery error: {0}")]
    Email(String),

    /// Unexpected internal failure (e.g. password/OTP hashing).
    #[error("internal error: {0}")]
    Internal(String),

    #[error("database error")]
    Database(#[from] sqlx::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::MissingToken | AppError::Unauthorized => {
                (StatusCode::UNAUTHORIZED, self.to_string())
            }
            AppError::Forbidden(_) => (StatusCode::FORBIDDEN, self.to_string()),
            AppError::BadRequest(_) => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::NotFound(_) => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::TooManyRequests(_) => (StatusCode::TOO_MANY_REQUESTS, self.to_string()),
            AppError::Auth0(msg) => {
                tracing::warn!(error = %msg, "auth provider error");
                (StatusCode::BAD_GATEWAY, "auth provider error".to_string())
            }
            AppError::Email(msg) => {
                tracing::error!(error = %msg, "email delivery error");
                (StatusCode::BAD_GATEWAY, "email delivery error".to_string())
            }
            AppError::Internal(msg) => {
                tracing::error!(error = %msg, "internal error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal server error".to_string(),
                )
            }
            AppError::Database(e) => {
                tracing::error!(error = %e, "database error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal server error".to_string(),
                )
            }
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}
