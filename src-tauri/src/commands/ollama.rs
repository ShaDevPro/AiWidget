use crate::AppState;
use crate::ollama_installer::OllamaStatus;

#[tauri::command]
pub async fn check_ollama_status(
    state: tauri::State<'_, AppState>,
    base_url: Option<String>,
) -> Result<OllamaStatus, String> {
    let url = {
        let settings = state.settings.lock().map_err(|e| e.to_string())?;
        base_url.unwrap_or_else(|| settings.ollama_base_url.clone())
    };
    Ok(crate::ollama_installer::check_status(&url).await)
}

#[tauri::command]
pub fn start_ollama() -> Result<(), String> {
    crate::ollama_installer::start_service()
}

#[tauri::command]
pub async fn install_ollama(window: tauri::Window) -> Result<(), String> {
    crate::ollama_installer::download_and_install(window).await
}
