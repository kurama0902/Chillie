-- basicUserSetup support.
-- 1) is_new: true for freshly-created users, flipped to false once basic setup completes.
-- 2) preferable_location becomes JSONB ({ lat, lng }) to match `location`. It is always
--    NULL in practice (login never writes it), so the cast is safe; NULLIF guards any
--    stray empty strings.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE users
    ALTER COLUMN preferable_location TYPE JSONB
    USING NULLIF(preferable_location, '')::jsonb;
