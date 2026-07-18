use std::str::FromStr;

use chrono::{Datelike, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json as SqlxJson;

/// POST /login request body.
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    #[serde(default, alias = "deviceFingerprint", alias = "device_fingerprint")]
    pub fingerprint: Option<String>,
}

/// POST /signUp request body. Email + password sign-up, independent of Auth0.
#[derive(Debug, Deserialize)]
pub struct SignUpRequest {
    pub email: String,
    pub password: String,
}

/// POST /verifyEmail request body. `otpCode` is the code mailed by /signUp.
#[derive(Debug, Deserialize)]
pub struct VerifyEmailRequest {
    pub email: String,
    #[serde(rename = "otpCode")]
    pub otp_code: String,
}

/// POST /verifyEmail response.
#[derive(Debug, Serialize)]
pub struct VerifyEmailResponse {
    #[serde(rename = "isSuccess")]
    pub is_success: bool,
}

/// POST /likeUser and /dislikeUser request. `userID` is the target user's
/// application ID from their verified access token.
#[derive(Debug, Deserialize)]
pub struct LikeRequest {
    #[serde(rename = "userID")]
    pub user_id: String,
}

#[derive(Debug, Serialize)]
pub struct LikeResponse {
    #[serde(rename = "isSuccess")]
    pub is_success: bool,
}

#[derive(Debug, Serialize)]
pub struct AvatarResponse {
    pub avatar_url: String,
}

/// POST /basicUserSetup request body. `location` arrives as a string (see
/// `Coordinates::from_str`); every `preferableLocation` string is preserved.
/// `isNew` is accepted for contract symmetry but ignored — the server always
/// sets it false.
#[derive(Debug, Deserialize)]
pub struct BasicUserSetupRequest {
    pub name: String,
    pub lastname: String,
    pub email: String,
    pub date_of_birth: String,
    #[serde(alias = "hobbies")]
    pub interests: Vec<String>,
    pub languages: Vec<String>,
    pub location: String,
    #[serde(rename = "preferableLocation")]
    pub preferable_location: Vec<String>,
    // Accepted for contract symmetry but intentionally ignored: the server
    // always sets is_new = false once setup completes.
    #[allow(dead_code)]
    #[serde(rename = "isNew", default)]
    pub is_new: bool,
    #[serde(rename = "interestedIn", default)]
    pub interested_in: Option<String>,
    #[serde(rename = "sexualOrientation", default)]
    pub sexual_orientation: Option<String>,
    #[serde(default)]
    pub job: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
}

/// Validated filters used by GET /getFilteredData.
#[derive(Debug, Default)]
pub struct DiscoveryFilters {
    pub interested_in: Option<String>,
    pub locations: Vec<String>,
    pub hobbies: Vec<String>,
    pub languages: Vec<String>,
    pub sexual_orientations: Vec<String>,
    pub distance_km: Option<f64>,
    pub age: Option<(i32, i32)>,
}

/// A geographic point stored as JSONB (`{ lat, lng }`) for `location`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Coordinates {
    pub lat: f64,
    pub lng: f64,
}

impl Coordinates {
    fn validated(self) -> Result<Self, String> {
        if !self.lat.is_finite() || !self.lng.is_finite() {
            return Err("lat/lng must be finite numbers".to_string());
        }
        if !(-90.0..=90.0).contains(&self.lat) {
            return Err("lat must be within [-90, 90]".to_string());
        }
        if !(-180.0..=180.0).contains(&self.lng) {
            return Err("lng must be within [-180, 180]".to_string());
        }
        Ok(self)
    }
}

/// Parse a client-supplied coordinate string. Accepts either `"lat,lng"` (e.g.
/// `"40.71,-74.0"`) or a JSON object (e.g. `{"lat":40.71,"lng":-74.0}`).
impl FromStr for Coordinates {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let t = s.trim();
        if t.is_empty() {
            return Err("empty coordinate string".to_string());
        }
        if t.starts_with('{') {
            let c: Coordinates =
                serde_json::from_str(t).map_err(|e| format!("invalid coordinate JSON: {e}"))?;
            return c.validated();
        }
        let (lat, lng) = t
            .split_once(',')
            .ok_or_else(|| "expected \"lat,lng\"".to_string())?;
        let lat = lat
            .trim()
            .parse::<f64>()
            .map_err(|_| "lat is not a number".to_string())?;
        let lng = lng
            .trim()
            .parse::<f64>()
            .map_err(|_| "lng is not a number".to_string())?;
        Coordinates { lat, lng }.validated()
    }
}

/// Structured `location` column (stored as JSONB). All fields optional.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserLocation {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lat: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lng: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub city: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub country: Option<String>,
}

/// Parse a location string: try `lat,lng` / JSON-coords first; if that fails,
/// treat the whole string as a city name.
impl FromStr for UserLocation {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let t = s.trim();
        if t.is_empty() {
            return Err("empty location string".to_string());
        }
        if let Ok(c) = t.parse::<Coordinates>() {
            return Ok(UserLocation {
                lat: Some(c.lat),
                lng: Some(c.lng),
                city: None,
                country: None,
            });
        }
        Ok(UserLocation {
            lat: None,
            lng: None,
            city: Some(t.to_string()),
            country: None,
        })
    }
}

/// One row of the `users` table, as read from Postgres.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct UserRow {
    pub user_id: Option<String>,
    pub name: Option<String>,
    pub lastname: Option<String>,
    pub email: String,
    pub date_of_birth: Option<NaiveDate>,
    pub profile_photos: Option<Vec<String>>,
    pub interests: Option<Vec<String>>,
    pub languages: Option<Vec<String>>,
    pub location: Option<SqlxJson<UserLocation>>,
    pub preferable_location: Vec<String>,
    pub is_new: bool,
    pub job: Option<String>,
    pub description: Option<String>,
    pub avatar_url: Option<String>,
    pub sexual_orientation: Option<String>,
}

/// Public discovery result. Email and `people_liked` are intentionally omitted.
#[derive(Debug, Serialize)]
pub struct FilteredUserResponse {
    #[serde(rename = "userID")]
    pub user_id: String,
    pub name: String,
    pub lastname: String,
    pub age: String,
    pub job: String,
    pub image_url: String,
    #[serde(rename = "additionalProfileImageUrls")]
    pub additional_profile_image_urls: Vec<String>,
    pub description: String,
    pub city: String,
    pub distance: String,
    pub hobbies: Vec<String>,
}

impl FilteredUserResponse {
    pub fn from_user(row: UserRow, origin: Option<(f64, f64)>) -> Self {
        let mut photos = row.profile_photos.unwrap_or_default().into_iter();
        let image_url = photos.next().unwrap_or_default();
        let additional_profile_image_urls = photos.collect();
        let city = row
            .location
            .as_ref()
            .and_then(|location| location.0.city.clone())
            .unwrap_or_default();
        let distance = origin
            .and_then(|origin| {
                coordinates(&row.location).map(|target| haversine_km(origin, target))
            })
            .map(format_distance)
            .unwrap_or_default();

        Self {
            user_id: row.user_id.unwrap_or_default(),
            name: row.name.unwrap_or_default(),
            lastname: row.lastname.unwrap_or_default(),
            age: row
                .date_of_birth
                .and_then(|birth_date| age_at(Utc::now().date_naive(), birth_date))
                .map(|age| age.to_string())
                .unwrap_or_default(),
            job: row.job.unwrap_or_default(),
            image_url,
            additional_profile_image_urls,
            description: row.description.unwrap_or_default(),
            city,
            distance,
            hobbies: row.interests.unwrap_or_default(),
        }
    }
}

fn coordinates(location: &Option<SqlxJson<UserLocation>>) -> Option<(f64, f64)> {
    let location = location.as_ref()?;
    let lat = location.0.lat?;
    let lng = location.0.lng?;
    if !lat.is_finite()
        || !lng.is_finite()
        || !(-90.0..=90.0).contains(&lat)
        || !(-180.0..=180.0).contains(&lng)
    {
        return None;
    }
    Some((lat, lng))
}

fn age_at(today: NaiveDate, birth_date: NaiveDate) -> Option<i32> {
    if birth_date > today {
        return None;
    }

    let birthday_passed = (today.month(), today.day()) >= (birth_date.month(), birth_date.day());
    Some(today.year() - birth_date.year() - i32::from(!birthday_passed))
}

fn haversine_km((lat1, lng1): (f64, f64), (lat2, lng2): (f64, f64)) -> f64 {
    let earth_radius_km = 6371.0;
    let lat_delta = (lat2 - lat1).to_radians();
    let lng_delta = (lng2 - lng1).to_radians();
    let lat1 = lat1.to_radians();
    let lat2 = lat2.to_radians();

    let a =
        (lat_delta / 2.0).sin().powi(2) + lat1.cos() * lat2.cos() * (lng_delta / 2.0).sin().powi(2);
    earth_radius_km * 2.0 * a.sqrt().asin()
}

fn format_distance(distance_km: f64) -> String {
    format!("{distance_km:.1} km")
}

/// Shared response body for POST /login and POST /basicUserSetup.
/// Strings always serialize (missing → `""`) and arrays as `[]`; `location` may
/// be `null`. Client-facing compatibility fields keep their established casing.
#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub name: String,
    pub lastname: String,
    pub email: String,
    pub date_of_birth: String,
    pub profile_photos: Vec<String>,
    pub interests: Vec<String>,
    pub languages: Vec<String>,
    pub location: Option<UserLocation>,
    #[serde(rename = "preferableLocation")]
    pub preferable_location: Vec<String>,
    pub avatar_url: String,
    #[serde(rename = "sexualOrientation")]
    pub sexual_orientation: String,
    #[serde(rename = "isNew")]
    pub is_new: bool,
}

impl From<UserRow> for UserResponse {
    fn from(row: UserRow) -> Self {
        UserResponse {
            name: row.name.unwrap_or_default(),
            lastname: row.lastname.unwrap_or_default(),
            email: row.email,
            // DATE -> ISO 8601 "YYYY-MM-DD" string ("" when unset).
            date_of_birth: row.date_of_birth.map(|d| d.to_string()).unwrap_or_default(),
            profile_photos: row.profile_photos.unwrap_or_default(),
            interests: row.interests.unwrap_or_default(),
            languages: row.languages.unwrap_or_default(),
            location: row.location.map(|j| j.0),
            preferable_location: row.preferable_location,
            avatar_url: row.avatar_url.unwrap_or_default(),
            sexual_orientation: row.sexual_orientation.unwrap_or_default(),
            is_new: row.is_new,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A brand-new user (every nullable column empty) must still serialize every
    /// field, with `""`/`[]` defaults; only `location` is null.
    #[test]
    fn new_user_response_has_no_null_strings_or_arrays() {
        let row = UserRow {
            user_id: None,
            name: None,
            lastname: None,
            email: "user@example.com".to_string(),
            date_of_birth: None,
            profile_photos: None,
            interests: None,
            languages: None,
            location: None,
            preferable_location: Vec::new(),
            is_new: true,
            job: None,
            description: None,
            avatar_url: None,
            sexual_orientation: None,
        };

        let json = serde_json::to_string_pretty(&UserResponse::from(row)).unwrap();
        println!("{json}");
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();

        assert_eq!(v["name"], "");
        assert_eq!(v["lastname"], "");
        assert_eq!(v["email"], "user@example.com");
        assert_eq!(v["date_of_birth"], "");
        assert_eq!(v["profile_photos"], serde_json::json!([]));
        assert_eq!(v["interests"], serde_json::json!([]));
        assert_eq!(v["languages"], serde_json::json!([]));
        assert_eq!(v["location"], serde_json::Value::Null);
        assert_eq!(v["preferableLocation"], serde_json::json!([]));
        assert_eq!(v["avatar_url"], "");
        assert_eq!(v["sexualOrientation"], "");
        assert_eq!(v["isNew"], true);
    }

    #[test]
    fn coordinates_parse_pair_and_json() {
        let c: Coordinates = "40.71,-74.0".parse().unwrap();
        assert_eq!(c.lat, 40.71);
        assert_eq!(c.lng, -74.0);

        let c: Coordinates = r#"{"lat":34.05,"lng":-118.24}"#.parse().unwrap();
        assert_eq!(c.lat, 34.05);
        assert_eq!(c.lng, -118.24);

        // surrounding whitespace is tolerated
        assert!(" 1.0 , 2.0 ".parse::<Coordinates>().is_ok());
    }

    #[test]
    fn discovery_response_matches_card_contract() {
        let row = UserRow {
            user_id: Some("auth0|target-user".into()),
            name: Some("Alex".into()),
            lastname: Some("Doe".into()),
            email: "hidden@example.com".into(),
            date_of_birth: None,
            profile_photos: Some(vec!["main.jpg".into(), "second.jpg".into()]),
            interests: Some(vec!["music".into()]),
            languages: Some(vec!["English".into()]),
            location: Some(SqlxJson(UserLocation {
                lat: Some(52.52),
                lng: Some(13.405),
                city: Some("Berlin".into()),
                country: Some("Germany".into()),
            })),
            preferable_location: Vec::new(),
            is_new: false,
            job: Some("Engineer".into()),
            description: Some("Profile text".into()),
            avatar_url: Some("https://example.com/avatar.jpg".into()),
            sexual_orientation: Some("Pansexual".into()),
        };

        let profile_json = serde_json::to_value(UserResponse::from(row.clone())).unwrap();
        assert_eq!(profile_json["sexualOrientation"], "Pansexual");

        let json =
            serde_json::to_value(FilteredUserResponse::from_user(row, Some((52.52, 13.405))))
                .unwrap();

        assert_eq!(json["userID"], "auth0|target-user");
        assert_eq!(json["image_url"], "main.jpg");
        assert_eq!(
            json["additionalProfileImageUrls"],
            serde_json::json!(["second.jpg"])
        );
        assert_eq!(json["job"], "Engineer");
        assert_eq!(json["description"], "Profile text");
        assert_eq!(json["city"], "Berlin");
        assert_eq!(json["distance"], "0.0 km");
        assert_eq!(json["hobbies"], serde_json::json!(["music"]));
        assert!(json.get("email").is_none());
        assert!(json.get("profilePhotos").is_none());
    }

    #[test]
    fn calculates_age_after_birthday_boundary() {
        let birth_date = NaiveDate::from_ymd_opt(2000, 7, 11).unwrap();
        assert_eq!(
            age_at(NaiveDate::from_ymd_opt(2026, 7, 10).unwrap(), birth_date),
            Some(25)
        );
        assert_eq!(
            age_at(NaiveDate::from_ymd_opt(2026, 7, 11).unwrap(), birth_date),
            Some(26)
        );
    }

    #[test]
    fn coordinates_reject_garbage_and_out_of_range() {
        assert!("not-a-coordinate".parse::<Coordinates>().is_err());
        assert!("40.71".parse::<Coordinates>().is_err()); // missing lng
        assert!("".parse::<Coordinates>().is_err());
        assert!("91.0,0.0".parse::<Coordinates>().is_err()); // lat out of range
        assert!("0.0,181.0".parse::<Coordinates>().is_err()); // lng out of range
    }
}
