-- Last device/browser fingerprint observed during a successful login.
ALTER TABLE users ADD COLUMN IF NOT EXISTS fingerprint TEXT;
