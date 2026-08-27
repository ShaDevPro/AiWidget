use serde_json::Value;

pub const METNO_USER_AGENT: &str = "WidgetAI/1.0 (desktop weather widget)";

pub fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(18))
        .connect_timeout(std::time::Duration::from_secs(8))
        .user_agent(METNO_USER_AGENT)
        .build()
        .map_err(|e| e.to_string())
}

fn open_meteo_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(6))
        .connect_timeout(std::time::Duration::from_secs(4))
        .user_agent(METNO_USER_AGENT)
        .build()
        .map_err(|e| e.to_string())
}

pub fn map_metno_symbol(symbol: &str) -> i32 {
    let s = symbol.to_lowercase();
    if s.contains("thunder") {
        return 95;
    }
    if s.contains("heavyrain") {
        return 65;
    }
    if s.contains("rain") || s.contains("sleet") {
        return 63;
    }
    if s.contains("lightrain") || s.contains("drizzle") {
        return 61;
    }
    if s.contains("heavysnow") {
        return 75;
    }
    if s.contains("snow") {
        return 71;
    }
    if s.contains("fog") {
        return 45;
    }
    if s.contains("partlycloudy") {
        return 2;
    }
    if s.contains("cloudy") || s.contains("overcast") {
        return 3;
    }
    if s.contains("fair") {
        return 1;
    }
    0
}

async fn fetch_open_meteo_current(
    client: &reqwest::Client,
    lat: f64,
    lon: f64,
) -> Result<(f32, i32), String> {
    let url = format!(
        "https://api.open-meteo.com/v1/forecast?latitude={:.4}&longitude={:.4}&current=temperature_2m,weather_code&timezone=auto",
        lat, lon
    );

    let weather: Value = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Open-Meteo request failed: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Open-Meteo JSON failed: {e}"))?;

    if let Some(current) = weather.get("current") {
        if !current.is_null() {
            let temperature = current["temperature_2m"]
                .as_f64()
                .ok_or_else(|| format!("Missing temperature_2m: {weather}"))? as f32;
            let weathercode = current["weather_code"].as_i64().unwrap_or(0) as i32;
            return Ok((temperature, weathercode));
        }
    }

    if let Some(cw) = weather.get("current_weather") {
        let temperature = cw["temperature"].as_f64().unwrap_or(0.0) as f32;
        let weathercode = cw["weathercode"].as_i64().unwrap_or(0) as i32;
        if temperature != 0.0 || weathercode != 0 {
            return Ok((temperature, weathercode));
        }
    }

    Err(format!("No current weather in Open-Meteo response: {weather}"))
}

async fn fetch_metno_current(
    client: &reqwest::Client,
    lat: f64,
    lon: f64,
) -> Result<(f32, i32), String> {
    let data = fetch_metno_raw(client, lat, lon).await?;
    let timeseries = data["properties"]["timeseries"]
        .as_array()
        .ok_or_else(|| format!("met.no missing timeseries: {data}"))?;

    for entry in timeseries {
        let instant = &entry["data"]["instant"]["details"];
        if let Some(temp) = instant["air_temperature"].as_f64() {
            let symbol = entry_symbol(entry).unwrap_or("clearsky_day");
            return Ok((temp as f32, map_metno_symbol(symbol)));
        }
    }

    Err("met.no returned no temperature data".into())
}

fn entry_symbol(entry: &Value) -> Option<&str> {
    entry["data"]["next_1_hours"]["summary"]["symbol_code"]
        .as_str()
        .or_else(|| entry["data"]["next_6_hours"]["summary"]["symbol_code"].as_str())
        .or_else(|| entry["data"]["next_12_hours"]["summary"]["symbol_code"].as_str())
}

async fn fetch_metno_raw(
    client: &reqwest::Client,
    lat: f64,
    lon: f64,
) -> Result<Value, String> {
    let url = format!(
        "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={:.4}&lon={:.4}",
        lat, lon
    );

    client
        .get(&url)
        .header("User-Agent", METNO_USER_AGENT)
        .send()
        .await
        .map_err(|e| format!("met.no request failed: {e}"))?
        .json()
        .await
        .map_err(|e| format!("met.no JSON failed: {e}"))
}

/// Current temperature + WMO-like code (Open-Meteo → met.no fallback).
pub async fn fetch_weather_current(lat: f64, lon: f64) -> Result<(f32, i32), String> {
    let metno_client = http_client()?;

    if let Ok(om_client) = open_meteo_client() {
        if let Ok(result) = fetch_open_meteo_current(&om_client, lat, lon).await {
            return Ok(result);
        }
    }

    fetch_metno_current(&metno_client, lat, lon).await
}

#[derive(Debug, Clone)]
pub struct ForecastSummary {
    pub current: f64,
    pub feels_like: f64,
    pub max_today: f64,
    pub min_today: f64,
    pub max_tomorrow: f64,
    pub min_tomorrow: f64,
}

/// Rich forecast for chat web context (met.no primary when Open-Meteo blocked).
pub async fn fetch_forecast_summary(lat: f64, lon: f64) -> Result<ForecastSummary, String> {
    let client = http_client()?;

    if let Ok(om) = open_meteo_client() {
        let url = format!(
            "https://api.open-meteo.com/v1/forecast?latitude={:.4}&longitude={:.4}&current=temperature_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min&timezone=auto",
            lat, lon
        );
        if let Ok(resp) = om.get(&url).send().await {
            if let Ok(fc) = resp.json::<Value>().await {
                let curr = fc["current"]["temperature_2m"].as_f64();
                if let Some(curr) = curr {
                    return Ok(ForecastSummary {
                        current: curr,
                        feels_like: fc["current"]["apparent_temperature"]
                            .as_f64()
                            .unwrap_or(curr),
                        max_today: fc["daily"]["temperature_2m_max"][0]
                            .as_f64()
                            .unwrap_or(curr),
                        min_today: fc["daily"]["temperature_2m_min"][0]
                            .as_f64()
                            .unwrap_or(curr),
                        max_tomorrow: fc["daily"]["temperature_2m_max"][1]
                            .as_f64()
                            .unwrap_or(curr),
                        min_tomorrow: fc["daily"]["temperature_2m_min"][1]
                            .as_f64()
                            .unwrap_or(curr),
                    });
                }
            }
        }
    }

    let data = fetch_metno_raw(&client, lat, lon).await?;
    let timeseries = data["properties"]["timeseries"]
        .as_array()
        .ok_or_else(|| "met.no missing timeseries".to_string())?;

    let today = chrono::Local::now().date_naive();
    let tomorrow = today + chrono::Duration::days(1);

    let mut current = None::<f64>;
    let mut max_today = f64::MIN;
    let mut min_today = f64::MAX;
    let mut max_tomorrow = f64::MIN;
    let mut min_tomorrow = f64::MAX;

    for entry in timeseries {
        let time_str = entry["time"].as_str().unwrap_or("");
        let Ok(dt) = chrono::DateTime::parse_from_rfc3339(time_str) else {
            continue;
        };
        let date = dt.date_naive();
        let temp = entry["data"]["instant"]["details"]["air_temperature"].as_f64();
        let Some(temp) = temp else { continue };

        if current.is_none() {
            current = Some(temp);
        }

        if date == today {
            max_today = max_today.max(temp);
            min_today = min_today.min(temp);
        } else if date == tomorrow {
            max_tomorrow = max_tomorrow.max(temp);
            min_tomorrow = min_tomorrow.min(temp);
        }
    }

    let curr = current.ok_or_else(|| "met.no no current temp".to_string())?;
    Ok(ForecastSummary {
        current: curr,
        feels_like: curr,
        max_today: if max_today.is_finite() { max_today } else { curr },
        min_today: if min_today.is_finite() { min_today } else { curr },
        max_tomorrow: if max_tomorrow.is_finite() {
            max_tomorrow
        } else {
            curr
        },
        min_tomorrow: if min_tomorrow.is_finite() {
            min_tomorrow
        } else {
            curr
        },
    })
}

pub async fn resolve_geo(client: &reqwest::Client) -> (f64, f64, String) {
    if let Ok(resp) = client.get("https://ipwho.is/").send().await {
        if let Ok(geo) = resp.json::<Value>().await {
            if geo["success"].as_bool() == Some(true) {
                if let (Some(lat), Some(lon)) = (geo["latitude"].as_f64(), geo["longitude"].as_f64())
                {
                    let city = geo["city"].as_str().unwrap_or("").to_string();
                    if lat.abs() > 0.001 || lon.abs() > 0.001 {
                        return (lat, lon, city);
                    }
                }
            }
        }
    }

    if let Ok(resp) = client.get("https://ipapi.co/json/").send().await {
        if let Ok(geo) = resp.json::<Value>().await {
            if geo.get("error").is_none() {
                if let (Some(lat), Some(lon)) =
                    (geo["latitude"].as_f64(), geo["longitude"].as_f64())
                {
                    let city = geo["city"].as_str().unwrap_or("").to_string();
                    return (lat, lon, city);
                }
            }
        }
    }

    if let Ok(resp) = client
        .get("http://ip-api.com/json/?fields=status,message,lat,lon,city")
        .send()
        .await
    {
        if let Ok(geo) = resp.json::<Value>().await {
            if geo["status"].as_str() == Some("success") {
                if let (Some(lat), Some(lon)) = (geo["lat"].as_f64(), geo["lon"].as_f64()) {
                    if lat.abs() > 0.001 || lon.abs() > 0.001 {
                        let city = geo["city"].as_str().unwrap_or("").to_string();
                        return (lat, lon, city);
                    }
                }
            }
        }
    }

    (36.7538, 3.0588, "Alger".to_string())
}

pub async fn geocode_city(client: &reqwest::Client, city: &str) -> Result<(f64, f64, String), String> {
    let trimmed = city.trim();
    if trimmed.is_empty() {
        return Err("City name is empty".into());
    }

    let geo_url = format!(
        "https://geocoding-api.open-meteo.com/v1/search?name={}&count=8&language=auto&format=json",
        urlencoding::encode(trimmed)
    );
    let geo: Value = client
        .get(&geo_url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let results = geo["results"]
        .as_array()
        .ok_or_else(|| format!("City not found: {trimmed}"))?;
    if results.is_empty() {
        return Err(format!("City not found: {trimmed}"));
    }

    let query_lower = trimmed.to_lowercase();
    let mut best: Option<(f64, f64, String, i64)> = None;

    for res in results {
        let name = res["name"].as_str().unwrap_or("").to_string();
        let lat = res["latitude"].as_f64().ok_or("No latitude")?;
        let lon = res["longitude"].as_f64().ok_or("No longitude")?;
        let pop = res["population"].as_i64().unwrap_or(0);
        let country = res["country_code"].as_str().unwrap_or("");
        let exact = name.to_lowercase() == query_lower;
        let starts = name.to_lowercase().starts_with(&query_lower);
        let mut score = pop;
        if exact {
            score += 10_000_000;
        } else if starts {
            score += 1_000_000;
        }
        if country.eq_ignore_ascii_case("DZ") {
            score += 500_000;
        }

        if best.as_ref().map(|b| score > b.3).unwrap_or(true) {
            best = Some((lat, lon, name, score));
        }
    }

    let (lat, lon, name, _) = best.ok_or_else(|| format!("City not found: {trimmed}"))?;
    Ok((lat, lon, name))
}
