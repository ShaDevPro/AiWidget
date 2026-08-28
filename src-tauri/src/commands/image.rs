use crate::sd_engine::{ImageGenerationResult, SDEngine, SDStatus};

#[tauri::command]
pub fn get_sd_status() -> SDStatus {
    SDEngine::get_status()
}

#[tauri::command]
pub async fn download_sd(window: tauri::Window) -> Result<(), String> {
    SDEngine::download_all(window).await
}

#[tauri::command]
pub async fn download_sd_model(model_key: String, window: tauri::Window) -> Result<(), String> {
    SDEngine::download_model_by_key(&model_key, window).await
}

#[tauri::command]
pub async fn generate_image_sd(
    prompt: String,
    negative_prompt: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    steps: Option<u32>,
    seed: Option<i64>,
    model_name: Option<String>,
    window: tauri::Window,
) -> Result<ImageGenerationResult, String> {
    SDEngine::generate_image(
        prompt,
        negative_prompt,
        width.unwrap_or(512),
        height.unwrap_or(512),
        steps.unwrap_or(15),
        seed,
        model_name,
        window,
    )
    .await
}

#[tauri::command]
pub fn open_sd_folder() -> Result<(), String> {
    let dir = SDEngine::get_sd_dir();
    if !dir.exists() {
        let _ = std::fs::create_dir_all(&dir);
    }
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer").arg(&dir).spawn();
    }
    Ok(())
}
