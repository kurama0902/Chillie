-- Additional fields required by the discovery-card response.
ALTER TABLE users ADD COLUMN IF NOT EXISTS job         TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS description TEXT;
