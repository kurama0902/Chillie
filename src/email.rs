//! OTP email delivery: renders a styled MJML template to responsive HTML and
//! ships it over SMTP via lettre. The mailer is built once at startup from
//! `SMTP_URL`; if that is unset the whole module short-circuits with an
//! `AppError::Email`, so /signUp fails loudly rather than silently dropping mail.

use lettre::message::header::ContentType;
use lettre::message::Mailbox;
use lettre::transport::smtp::AsyncSmtpTransport;
use lettre::{AsyncTransport, Message, Tokio1Executor};
use mrml::prelude::render::RenderOptions;

use crate::config::Config;
use crate::error::AppError;

/// Shared SMTP transport. `None` when no `SMTP_URL` is configured.
pub type Mailer = Option<AsyncSmtpTransport<Tokio1Executor>>;

/// Build the mailer from config. Returns `Ok(None)` (delivery disabled) when
/// `SMTP_URL` is absent, `Err` when the URL is present but malformed.
pub fn build_mailer(config: &Config) -> Result<Mailer, String> {
    let Some(url) = config.smtp_url.as_deref() else {
        return Ok(None);
    };
    let transport = AsyncSmtpTransport::<Tokio1Executor>::from_url(url)
        .map_err(|e| format!("invalid SMTP_URL: {e}"))?
        .build();
    Ok(Some(transport))
}

/// Render the OTP email body from MJML to responsive, inlined HTML.
fn render_otp_html(code: &str, ttl_secs: i64) -> Result<String, AppError> {
    let minutes = (ttl_secs + 59) / 60; // ceil to whole minutes for the copy
    let mjml = format!(
        r##"<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Helvetica, Arial, sans-serif" />
    </mj-attributes>
    <mj-style>
      .code {{ letter-spacing: 8px; }}
    </mj-style>
  </mj-head>
  <mj-body background-color="#f2f3f5">
    <mj-section padding="32px 0 8px">
      <mj-column>
        <mj-text align="center" font-size="24px" font-weight="700" color="#1a1a2e">
          Chillie
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#ffffff" border-radius="12px" padding="32px" css-class="card">
      <mj-column>
        <mj-text font-size="18px" font-weight="600" color="#1a1a2e" padding-bottom="8px">
          Confirm your email
        </mj-text>
        <mj-text font-size="14px" color="#555555" line-height="22px" padding-bottom="24px">
          Use the code below to verify your email address and finish signing up.
        </mj-text>
        <mj-text align="center" font-size="36px" font-weight="700" color="#5b4bff" css-class="code" padding="8px 0 24px">
          {code}
        </mj-text>
        <mj-text align="center" font-size="13px" color="#888888">
          This code expires in {minutes} minutes. If you didn't request it, you can ignore this email.
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section padding="16px 0 32px">
      <mj-column>
        <mj-text align="center" font-size="12px" color="#aaaaaa">
          &copy; Chillie
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>"##
    );

    let root = mrml::parse(&mjml).map_err(|e| AppError::Email(format!("mjml parse: {e}")))?;
    root.element
        .render(&RenderOptions::default())
        .map_err(|e| AppError::Email(format!("mjml render: {e}")))
}

/// Send the OTP `code` to `to_email`. `mailer` must be `Some` — callers guard
/// the disabled case and return a 502 with a clear message.
pub async fn send_otp(
    mailer: &Mailer,
    config: &Config,
    to_email: &str,
    code: &str,
) -> Result<(), AppError> {
    let mailer = mailer
        .as_ref()
        .ok_or_else(|| AppError::Email("email delivery is not configured".into()))?;

    let from: Mailbox = config
        .mail_from
        .parse()
        .map_err(|e| AppError::Email(format!("invalid MAIL_FROM: {e}")))?;
    let to: Mailbox = to_email
        .parse()
        .map_err(|e| AppError::Email(format!("invalid recipient: {e}")))?;

    let html = render_otp_html(code, config.otp_ttl_secs)?;

    let message = Message::builder()
        .from(from)
        .to(to)
        .subject("Your Chillie verification code")
        .header(ContentType::TEXT_HTML)
        .body(html)
        .map_err(|e| AppError::Email(format!("build message: {e}")))?;

    mailer
        .send(message)
        .await
        .map_err(|e| AppError::Email(format!("smtp send: {e}")))?;

    Ok(())
}
