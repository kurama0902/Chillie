-- Idempotently seed 500 discovery-ready mock profiles.
-- Public identities are mock|0001 ... mock|0500.
WITH
constants AS (
    SELECT
        ARRAY[
            'Jessica', 'Camila', 'Bred', 'Sophia', 'Daniel', 'Olivia', 'Lucas', 'Mia',
            'Ethan', 'Ava', 'Emma', 'Liam', 'Noah', 'Isabella', 'James', 'Amelia',
            'Benjamin', 'Charlotte', 'Henry', 'Luna', 'Alexander', 'Ella', 'Leo', 'Grace',
            'Samuel', 'Chloe', 'Max', 'Nora', 'Julian', 'Zoe'
        ]::TEXT[] AS first_names,
        ARRAY[
            'Parker', 'Snow', 'Jackson', 'Bennett', 'Morgan', 'Reed', 'Hayes', 'Clarke',
            'Walker', 'Turner', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas',
            'Martin', 'Lee', 'Harris', 'Lewis', 'Young', 'King', 'Wright', 'Scott',
            'Green', 'Baker', 'Adams', 'Nelson', 'Carter', 'Mitchell'
        ]::TEXT[] AS last_names,
        ARRAY[
            'Professional model', 'Interior designer', 'Photographer', 'Software engineer',
            'Chef', 'Nurse', 'Architect', 'Journalist', 'Personal trainer', 'Art student',
            'Product designer', 'Marketing manager', 'Teacher', 'Data analyst', 'Musician',
            'Doctor', 'UX researcher', 'Event planner', 'Film editor', 'Entrepreneur'
        ]::TEXT[] AS jobs,
        ARRAY[
            'Photography', 'Yoga', 'Travel', 'Hiking', 'Cooking', 'Design', 'Music',
            'Cycling', 'Climbing', 'Coding', 'Board games', 'Wine tasting', 'Running',
            'Volunteering', 'Painting', 'Dogs', 'Sketching', 'Sailing', 'Coffee', 'Writing',
            'Vinyl records', 'Fitness', 'Surfing', 'Drawing', 'Museums', 'Ceramics',
            'Reading', 'Dancing', 'Tennis', 'Cinema'
        ]::TEXT[] AS hobbies,
        ARRAY[
            'Coffee first, conversation later. I love spontaneous weekend trips and long walks through the city.',
            'Plant lover, weekend hiker, and incurable foodie looking for someone curious and kind.',
            'Chasing golden hours, good playlists, and conversations that last longer than expected.',
            'I build things by day and look for new adventures after work.',
            'I will cook, you bring the wine. Deal?',
            'Kind heart, big dreams, and a weakness for dogs.',
            'Minimalist by trade, romantic at heart.',
            'Always curious. Ask me about my last road trip.',
            'Gym in the morning, tacos at night. Balance is key.',
            'Museums, matcha, and midnight sketching sessions.'
        ]::TEXT[] AS descriptions
),
cities(city_no, city, lat, lng) AS (
    VALUES
        (1, 'Amsterdam', 52.3676::DOUBLE PRECISION, 4.9041::DOUBLE PRECISION),
        (2, 'Rotterdam', 51.9244::DOUBLE PRECISION, 4.4777::DOUBLE PRECISION),
        (3, 'Utrecht', 52.0907::DOUBLE PRECISION, 5.1214::DOUBLE PRECISION),
        (4, 'Eindhoven', 51.4416::DOUBLE PRECISION, 5.4697::DOUBLE PRECISION),
        (5, 'The Hague', 52.0705::DOUBLE PRECISION, 4.3007::DOUBLE PRECISION),
        (6, 'Groningen', 53.2194::DOUBLE PRECISION, 6.5665::DOUBLE PRECISION),
        (7, 'Haarlem', 52.3874::DOUBLE PRECISION, 4.6462::DOUBLE PRECISION),
        (8, 'Delft', 52.0116::DOUBLE PRECISION, 4.3571::DOUBLE PRECISION),
        (9, 'Leiden', 52.1601::DOUBLE PRECISION, 4.4970::DOUBLE PRECISION),
        (10, 'Maastricht', 50.8514::DOUBLE PRECISION, 5.6910::DOUBLE PRECISION)
),
generated AS (
    SELECT
        n,
        c.first_names[1 + ((n * 7) % array_length(c.first_names, 1))] AS first_name,
        c.last_names[1 + ((n * 11) % array_length(c.last_names, 1))] AS last_name,
        c.jobs[1 + ((n * 13) % array_length(c.jobs, 1))] AS job,
        c.descriptions[1 + ((n * 17) % array_length(c.descriptions, 1))] AS description,
        ARRAY[
            c.hobbies[1 + ((n * 5) % array_length(c.hobbies, 1))],
            c.hobbies[1 + ((n * 7 + 3) % array_length(c.hobbies, 1))],
            c.hobbies[1 + ((n * 11 + 9) % array_length(c.hobbies, 1))]
        ]::TEXT[] AS selected_hobbies,
        city.city,
        city.lat + ((((n * 19) % 101) - 50)::DOUBLE PRECISION / 10000.0) AS lat,
        city.lng + ((((n * 23) % 101) - 50)::DOUBLE PRECISION / 10000.0) AS lng,
        18 + ((n * 13) % 28) AS age,
        1 + ((n * 17) % 70) AS portrait_1,
        1 + ((n * 29 + 7) % 70) AS portrait_2,
        1 + ((n * 37 + 13) % 70) AS portrait_3,
        CASE n % 3 WHEN 0 THEN 'women' WHEN 1 THEN 'men' ELSE 'everyone' END AS interested_in,
        CASE n % 4
            WHEN 0 THEN 'straight'
            WHEN 1 THEN 'bisexual'
            WHEN 2 THEN 'gay'
            ELSE 'pansexual'
        END AS sexual_orientation
    FROM generate_series(1, 500) AS series(n)
    CROSS JOIN constants c
    JOIN cities city ON city.city_no = 1 + ((n * 7) % 10)
)
INSERT INTO users (
    user_id,
    name,
    lastname,
    email,
    date_of_birth,
    profile_photos,
    interests,
    languages,
    location,
    preferable_location,
    is_new,
    interested_in,
    sexual_orientation,
    job,
    description,
    fingerprint,
    email_verified,
    updated_at
)
SELECT
    format('mock|%s', lpad(n::TEXT, 4, '0')),
    first_name,
    last_name,
    format('mock.user.%s@chillie.test', lpad(n::TEXT, 4, '0')),
    CURRENT_DATE - make_interval(years => age) - make_interval(days => ((n * 37) % 330)),
    ARRAY[
        format('https://i.pravatar.cc/1000?img=%s', portrait_1),
        format('https://i.pravatar.cc/1000?img=%s', portrait_2),
        format('https://i.pravatar.cc/1000?img=%s', portrait_3)
    ]::TEXT[],
    selected_hobbies,
    CASE n % 4
        WHEN 0 THEN ARRAY['English', 'Dutch']::TEXT[]
        WHEN 1 THEN ARRAY['English']::TEXT[]
        WHEN 2 THEN ARRAY['Dutch', 'German']::TEXT[]
        ELSE ARRAY['English', 'French']::TEXT[]
    END,
    jsonb_build_object('lat', lat, 'lng', lng, 'city', city, 'country', 'Netherlands'),
    NULL,
    false,
    interested_in,
    sexual_orientation,
    job,
    description,
    format('mock-fingerprint-%s', lpad(n::TEXT, 4, '0')),
    true,
    now() - make_interval(hours => (n % 240))
FROM generated
ON CONFLICT (email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    name = EXCLUDED.name,
    lastname = EXCLUDED.lastname,
    date_of_birth = EXCLUDED.date_of_birth,
    profile_photos = EXCLUDED.profile_photos,
    interests = EXCLUDED.interests,
    languages = EXCLUDED.languages,
    location = EXCLUDED.location,
    preferable_location = EXCLUDED.preferable_location,
    is_new = EXCLUDED.is_new,
    interested_in = EXCLUDED.interested_in,
    sexual_orientation = EXCLUDED.sexual_orientation,
    job = EXCLUDED.job,
    description = EXCLUDED.description,
    fingerprint = EXCLUDED.fingerprint,
    email_verified = EXCLUDED.email_verified,
    updated_at = EXCLUDED.updated_at;
