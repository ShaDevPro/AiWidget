// sysinfo 0.30+ API — no trait imports, direct methods only
use sysinfo::{Pid, System, MINIMUM_CPU_UPDATE_INTERVAL};

use crate::weather_engine;

#[derive(serde::Serialize)]
pub struct SystemStats {
    pub cpu_pct: f32,
    pub ram_mb: u64,
    pub ram_total_mb: u64,
}

#[tauri::command]
pub fn get_system_stats() -> Result<SystemStats, String> {
    let mut sys = System::new_all();

    sys.refresh_cpu_usage();
    std::thread::sleep(MINIMUM_CPU_UPDATE_INTERVAL);
    sys.refresh_cpu_usage();
    sys.refresh_memory();

    let cpu_pct = {
        let cpus = sys.cpus();
        if cpus.is_empty() {
            0.0_f32
        } else {
            cpus.iter().map(|c| c.cpu_usage()).sum::<f32>() / cpus.len() as f32
        }
    };
    let ram_total_mb = sys.total_memory() / 1024 / 1024;

    let current_pid = Pid::from_u32(std::process::id());
    sys.refresh_process(current_pid);
    let ram_mb = sys
        .process(current_pid)
        .map(|p| p.memory() / 1024 / 1024)
        .unwrap_or(0);

    Ok(SystemStats {
        cpu_pct,
        ram_mb,
        ram_total_mb,
    })
}

#[derive(serde::Serialize)]
pub struct WeatherInfo {
    pub temperature: f32,
    pub weathercode: i32,
    pub city: String,
}

#[tauri::command]
pub async fn get_weather() -> Result<WeatherInfo, String> {
    let client = weather_engine::http_client()?;
    let (lat, lon, city) = weather_engine::resolve_geo(&client).await;
    let (temperature, weathercode) = weather_engine::fetch_weather_current(lat, lon).await?;
    Ok(WeatherInfo {
        temperature,
        weathercode,
        city,
    })
}

#[tauri::command]
pub async fn get_weather_for_city(city: String) -> Result<WeatherInfo, String> {
    let client = weather_engine::http_client()?;
    let (lat, lon, found_city) = weather_engine::geocode_city(&client, &city).await?;
    let (temperature, weathercode) = weather_engine::fetch_weather_current(lat, lon).await?;
    Ok(WeatherInfo {
        temperature,
        weathercode,
        city: found_city,
    })
}
