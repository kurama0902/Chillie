-- The API contract is string[]. Preserve the existing single JSONB location as
-- a one-item array, then replace the column with its final TEXT[] type.
ALTER TABLE users
    ADD COLUMN preferable_locations_v2 TEXT[] NOT NULL DEFAULT '{}';

UPDATE users
SET preferable_locations_v2 = CASE
    WHEN preferable_location IS NULL THEN ARRAY[]::TEXT[]
    WHEN jsonb_typeof(preferable_location) = 'string'
        THEN ARRAY[preferable_location #>> '{}']
    WHEN jsonb_typeof(preferable_location) = 'object'
         AND NULLIF(preferable_location->>'city', '') IS NOT NULL
        THEN ARRAY[preferable_location->>'city']
    WHEN jsonb_typeof(preferable_location) = 'object'
         AND preferable_location ? 'lat'
         AND preferable_location ? 'lng'
        THEN ARRAY[concat(preferable_location->>'lat', ',', preferable_location->>'lng')]
    ELSE ARRAY[]::TEXT[]
END;

ALTER TABLE users DROP COLUMN preferable_location;
ALTER TABLE users RENAME COLUMN preferable_locations_v2 TO preferable_location;
