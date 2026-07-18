# chillie-back

Rust (Axum) backend for Auth0 authentication, email verification, profile
setup, discovery filtering, and likes backed by PostgreSQL.

## Stack

- **axum 0.8** — HTTP
- **sqlx (Postgres)** — DB access + migrations (runtime queries, no compile-time DB needed)
- **jsonwebtoken + reqwest** — validates Auth0 access tokens locally against the tenant JWKS
- **PostgreSQL** — `interests` / `languages` / `profile_photos` as `TEXT[]`, `location` as `JSONB`

## Layout

```
src/
  main.rs      bootstrap: env, pool, migrations, router, serve
  config.rs    env config (DATABASE_URL, issuerBaseURL, BIND_ADDR, SMTP)
  error.rs     AppError -> HTTP status + JSON
  models.rs    LoginRequest, UserLocation, UserRow, UserResponse
  auth.rs      bearer extraction + Auth0 JWT validation (JWKS cache)
  email.rs     SMTP + MJML OTP email delivery
  otp.rs       OTP generation, hashing, persistence, and verification
  repo.rs      users, discovery filters, and atomic likes
  routes.rs    HTTP endpoint handlers
migrations/
  0001_init.sql ... 0010_user_avatar.sql
```

## Run

1. Start Postgres:
   ```sh
   docker compose up -d
   ```
2. Configure env:
   ```sh
   cp .env.example .env
   # issuerBaseURL = your tenant, e.g. https://dev-abc123.us.auth0.com
   # audience      = your API identifier (so Auth0 issues a JWT access token)
   # tokenSigningAlg = RS256 (Auth0 default)
   ```
3. Run (migrations apply automatically on startup):
   ```sh
   cargo run
   ```
   Server listens on `http://0.0.0.0:8080`.

## Endpoints

### `POST /login`

**Headers**
```
Authorization: Bearer <auth0-access-token>
Content-Type: application/json
```

**Body**
```json
{
  "email": "user@example.com",
  "fingerprint": "browser-or-device-fingerprint"
}
```

`fingerprint` is stored on every successful login. The API also accepts
`deviceFingerprint`, `device_fingerprint`, or the `X-Device-Fingerprint`
header. When omitted, the previously stored value is preserved.

The verified token identity (`userID`, `user_id`, `id`, or standard Auth0
`sub`) is saved as `users.user_id` and is the public ID used by discovery,
likes, and dislikes.

**Response `200`**
```json
{
  "name": "",
  "lastname": "",
  "email": "user@example.com",
  "date_of_birth": "",
  "profile_photos": [],
  "interests": [],
  "languages": [],
  "location": null,
  "preferableLocation": [],
  "avatar_url": "",
  "sexualOrientation": "",
  "isNew": true
}
```
The validated token is echoed back in the response `Authorization` header.

### `POST /updateAvatar`

Requires `Authorization: Bearer <access-token>` and `multipart/form-data`.
The image field may be named `avatar`, `image`, or `file`. JPEG, PNG, WebP,
GIF, HEIC, and HEIF files up to 8 MB are accepted.

```sh
curl -X POST https://chillie.kemuri.top/updateAvatar \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "avatar=@profile.jpg"
```

```json
{
  "avatar_url": "https://chillie.kemuri.top/uploads/8dc1b8ce-5e79-4caa-9d33-92200c280d6f.jpg"
}
```

The same URL is returned by subsequent `/login` and `/basicUserSetup`
responses.

### `GET /getFilteredData`

Requires `Authorization: Bearer <access-token>`. Filters are passed as query
parameters. Arrays may be repeated, use bracket syntax, be comma-separated, or
be JSON-encoded.

`interestedIn=both` (also `all` or `everyone`) disables the `interested_in`
restriction and returns both groups.

```sh
curl --get http://localhost:8080/getFilteredData \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  --data-urlencode "interestedIn=both" \
  --data-urlencode "preferableLocation[]=Amsterdam" \
  --data-urlencode "interests[]=Animation" \
  --data-urlencode "languages[]=English" \
  --data-urlencode "sexualOrientation=Straight" \
  --data-urlencode "distance=40" \
  --data-urlencode "age[]=18" \
  --data-urlencode "age[]=96"
```

`distance` is measured from the authenticated user's saved `location.lat` /
`location.lng`. Results are capped at 100 and contain `userID`, which can be
passed to `/likeUser`. Emails and inbound likes are not exposed.

When `location[]` is supplied, every name is validated against the supported
Netherlands city list. The first selected city is saved to the authenticated
user as `{ city, country, lat, lng }` and becomes the origin for distance
filtering. City coordinates come from the GeoNames Netherlands dataset
(CC BY 4.0); the accepted names are listed in `data/netherlands_cities.txt`.

```json
[
  {
    "userID": "auth0|target-user",
    "name": "Alex",
    "lastname": "Doe",
    "age": "28",
    "job": "Engineer",
    "image_url": "https://cdn.example.com/profile/main.jpg",
    "additionalProfileImageUrls": [
      "https://cdn.example.com/profile/second.jpg"
    ],
    "description": "Profile text",
    "city": "Berlin",
    "distance": "12.4 km",
    "hobbies": ["music", "sport"]
  }
]
```

`userID` is included as a technical field because it is required by `/likeUser`.
`job` and `description` can be supplied as optional fields to
`/basicUserSetup`. `image_url` is the first `profile_photos` item and
`additionalProfileImageUrls` contains the remaining items.

### `POST /likeUser`

Requires `Authorization: Bearer <access-token>`.

```json
{ "userID": "auth0|target-user" }
```

The target user is found by their saved JWT `userID`. The caller ID is read
only from the verified token and is appended idempotently to the target user's
`people_liked` array.

```json
{ "isSuccess": true }
```

### `POST /dislikeUser`

Requires `Authorization: Bearer <access-token>`.

```json
{ "userID": "auth0|target-user" }
```

The target ID is appended idempotently to the current user's
`people_dislike` array. A timestamped dislike record also suppresses that
profile from `/getFilteredData` for two hours. Repeating the request restarts
the two-hour window.

```json
{ "isSuccess": true }
```

**Errors**
| Status | When |
|--------|------|
| `400`  | email missing / malformed |
| `401`  | no/!bad bearer token, or Auth0 rejects it |
| `403`  | body email ≠ the email proven by the token |
| `502`  | Auth0 unreachable / unexpected response |

**Example**
```sh
curl -X POST http://localhost:8080/login \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

## Notes / decisions

- **Auth0 verification** is done locally: the access-token JWT is verified
  against the tenant JWKS (`{issuerBaseURL}/.well-known/jwks.json`), checking
  signature, `iss`, `aud` (= `audience`), `exp` and the `tokenSigningAlg`
  algorithm. The JWKS is cached and refreshed only on a `kid` miss.
- **The token must be a JWT** for the configured `audience`. The client has to
  request the token with that `audience`, otherwise Auth0 returns an opaque
  access token and validation fails with `401`.
- **Email match**: Auth0 access tokens usually have no `email` claim, so the
  body email is used for the lookup (the JWT proves authentication). If a custom
  `email` claim *is* present it must match the body. Adjust in `routes.rs`.
- **"New token"**: local validation does not issue tokens, so the same token is
  passed back. Real rotation needs the refresh-token grant against `/oauth/token`.
- The `users.id` (UUID) is generated but intentionally omitted from the response
  to match the agreed contract.
