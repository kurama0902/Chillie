-- Users table. interests / languages / profile_photos are native text arrays,
-- location is JSONB ({ lat, lng, city, country }). Email is the natural key.
CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT,
    lastname            TEXT,
    email               TEXT NOT NULL UNIQUE,
    date_of_birth       DATE,
    profile_photos      TEXT[],
    interests           TEXT[],
    languages           TEXT[],
    location            JSONB,
    preferable_location TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
