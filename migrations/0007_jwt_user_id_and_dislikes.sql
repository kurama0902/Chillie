-- Persist the application identity proven by the access token.
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_id        TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS people_dislike TEXT[] NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS users_user_id_unique_idx
    ON users (user_id)
    WHERE user_id IS NOT NULL;

-- The array above satisfies the user profile contract. This normalized table
-- stores the timestamp needed to hide a disliked profile for exactly two hours.
CREATE TABLE IF NOT EXISTS user_dislikes (
    actor_user_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    disliked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (actor_user_id, target_user_id),
    CHECK (actor_user_id <> target_user_id)
);

CREATE INDEX IF NOT EXISTS user_dislikes_active_idx
    ON user_dislikes (actor_user_id, disliked_at DESC);
