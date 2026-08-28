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
pub async fn generate_image_sd(
    prompt: String,
    negative_prompt: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    steps: Option<u32>,
    seed: Option<i64>,
    window: tauri::Window,
) -> Result<ImageGenerationResult, String> {
    SDEngine::generate_image(
        prompt,
        negative_prompt,
        width.unwrap_or(512),
        height.unwrap_or(512),
        steps.unwrap_or(15),
        seed,
        window,
    )
    .await
}
