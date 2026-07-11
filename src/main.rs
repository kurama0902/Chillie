mod auth;
mod config;
mod email;
mod error;
mod models;
mod otp;
mod repo;
mod routes;

use std::sync::Arc;
use std::time::Duration;

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

use crate::auth::JwksCache;
use crate::config::Config;
use crate::email::Mailer;

/// Shared, cheaply-cloneable application state handed to every handler.
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub http: reqwest::Client,
    pub config: Config,
    pub jwks: Arc<JwksCache>,
    pub mailer: Arc<Mailer>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info,chillie_back=debug")),
        )
        .init();

    let config = Config::from_env()?;

    // Postgres pool + run migrations on startup.
    let db = PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&config.database_url)
        .await?;
    sqlx::migrate!("./migrations").run(&db).await?;

    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()?;

    // Warm the JWKS cache; tolerate failure (it refreshes lazily per request).
    let jwks = Arc::new(JwksCache::new(config.jwks_url()));
    if let Err(e) = jwks.refresh(&http).await {
        tracing::warn!(error = %e, "could not prefetch JWKS at startup; will retry on demand");
    }

    // Build the SMTP mailer once; None (delivery disabled) is tolerated at
    // startup and surfaced as a 502 only when /signUp actually tries to send.
    let mailer = email::build_mailer(&config).map_err(|e| {
        tracing::error!(error = %e, "invalid SMTP configuration");
        e
    })?;
    if mailer.is_none() {
        tracing::warn!("SMTP_URL not set; OTP email delivery is disabled");
    }

    let state = AppState {
        db,
        http,
        config: config.clone(),
        jwks,
        mailer: Arc::new(mailer),
    };

    let app = routes::router(state)
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind(&config.bind_addr).await?;
    tracing::info!("listening on http://{}", config.bind_addr);
    axum::serve(listener, app).await?;

    Ok(())
}
