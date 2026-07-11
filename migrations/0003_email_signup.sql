-- Email + password sign-up flow (independent of Auth0).
-- 1) password_hash: argon2 hash written by /signUp. NULL for Auth0-only users.
-- 2) email_verified: flipped to true by /verifyEmail once the OTP checks out.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- One live OTP per email. /signUp upserts (replacing any prior code); /verifyEmail
-- reads it, checks expiry/attempts, and deletes it on success. code_hash is an
-- argon2 hash so a DB leak never exposes live codes.
CREATE TABLE IF NOT EXISTS email_otps (
    email      TEXT PRIMARY KEY,
    code_hash  TEXT        NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts   INT         NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
