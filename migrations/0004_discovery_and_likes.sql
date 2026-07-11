-- Discovery filters and inbound likes.
-- `people_liked` stores the verified access-token user IDs of people who liked
-- this profile. The API appends idempotently, so one person appears at most once.
ALTER TABLE users ADD COLUMN IF NOT EXISTS interested_in       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sexual_orientation TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS people_liked        TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS users_interests_gin_idx
    ON users USING GIN (interests);

CREATE INDEX IF NOT EXISTS users_people_liked_gin_idx
    ON users USING GIN (people_liked);
