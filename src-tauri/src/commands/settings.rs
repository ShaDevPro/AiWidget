use crate::AppState;
use crate::models::AppSettings;

#[tauri::command]
pub fn get_settings(state: tauri::State<AppState>) -> Result<AppSettings, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.get_settings().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_settings(state: tauri::State<AppState>, settings: AppSettings) -> Result<(), String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.save_settings(&settings).map_err(|e| e.to_string())?;
    let mut current_settings = state.settings.lock().map_err(|e| e.to_string())?;
    *current_settings = settings;
    Ok(())
}

#[tauri::command]
pub fn get_autostart_status() -> bool {
    #[cfg(target_os = "windows")]
    {
        let output = std::process::Command::new("reg")
            .args(&["query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "AIWidget"])
            .output();
        match output {
            Ok(o) => o.status.success(),
            Err(_) => false,
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}

#[tauri::command]
pub fn set_autostart_status(enabled: bool) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        if enabled {
            let exe = std::env::current_exe().map_err(|e| e.to_string())?;
            let path_str = exe.to_string_lossy();
            let status = std::process::Command::new("reg")
                .args(&[
                    "add",
                    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                    "/v",
                    "AIWidget",
                    "/t",
                    "REG_SZ",
                    "/d",
                    &format!("\"{}\"", path_str),
                    "/f",
                ])
                .status()
                .map_err(|e| e.to_string())?;
            Ok(status.success())
        } else {
            let _ = std::process::Command::new("reg")
                .args(&["delete", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "AIWidget", "/f"])
                .status();
            Ok(false)
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(false)
    }
}
