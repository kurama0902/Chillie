use std::env;
use std::path::PathBuf;

/// Runtime configuration, loaded from the environment (see `.env.example`).
/// Auth0 settings reuse the Auth0 SDK names: `issuerBaseURL`, `audience`,
/// `tokenSigningAlg`.
#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub issuer_base_url: String,
    pub audience: String,
    pub token_signing_alg: String,
    pub bind_addr: String,

    /// lettre SMTP connection URL, e.g. `smtps://user:pass@smtp.host:465`.
    /// `None` disables email delivery — /signUp then returns 502.
    pub smtp_url: Option<String>,
    /// `From` header for OTP mail, e.g. `Chillie <no-reply@chillie.top>`.
    pub mail_from: String,
    /// OTP lifetime in seconds (spec: 300).
    pub otp_ttl_secs: i64,
    pub upload_dir: PathBuf,
    pub public_base_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        let database_url =
            env::var("DATABASE_URL").map_err(|_| "DATABASE_URL is required".to_string())?;
        let issuer_base_url =
            env::var("issuerBaseURL").map_err(|_| "issuerBaseURL is required".to_string())?;
        let audience = env::var("audience").map_err(|_| "audience is required".to_string())?;
        let token_signing_alg = env::var("tokenSigningAlg").unwrap_or_else(|_| "RS256".to_string());
        let bind_addr = env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());

        let smtp_url = env::var("SMTP_URL").ok().filter(|s| !s.trim().is_empty());
        let mail_from =
            env::var("MAIL_FROM").unwrap_or_else(|_| "Chillie <no-reply@chillie.top>".to_string());
        let otp_ttl_secs = env::var("OTP_TTL_SECS")
            .ok()
            .and_then(|v| v.trim().parse::<i64>().ok())
            .unwrap_or(300);
        let upload_dir = env::var("UPLOAD_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("uploads"));
        let public_base_url = env::var("PUBLIC_BASE_URL")
            .unwrap_or_default()
            .trim()
            .trim_end_matches('/')
            .to_string();

        Ok(Self {
            database_url,
            issuer_base_url,
            audience,
            token_signing_alg,
            bind_addr,
            smtp_url,
            mail_from,
            otp_ttl_secs,
            upload_dir,
            public_base_url,
        })
    }

    /// Normalized issuer base: scheme + host, no trailing slash.
    /// `https://` is assumed when no scheme is given.
    pub fn issuer_base(&self) -> String {
        let v = self.issuer_base_url.trim().trim_end_matches('/');
        if v.starts_with("http://") || v.starts_with("https://") {
            v.to_string()
        } else {
            format!("https://{v}")
        }
    }

    /// Auth0 JWKS endpoint.
    pub fn jwks_url(&self) -> String {
        format!("{}/.well-known/jwks.json", self.issuer_base())
    }

    /// Accepted `iss` claim values. Auth0 issues with a trailing slash; we
    /// accept both forms to be safe.
    pub fn issuers(&self) -> Vec<String> {
        let base = self.issuer_base();
        vec![format!("{base}/"), base]
    }

    pub fn avatar_url(&self, filename: &str) -> String {
        format!("{}/uploads/{filename}", self.public_base_url)
    }
}
