use crate::AppState;
use crate::models::LLMModel;
use crate::gguf_manager::{CuratedGGUFModel, GGUFManager, InstalledGGUFModel, PartialGGUFDownload};
use crate::llama_engine::LlamaEngineStatus;

#[tauri::command]
pub fn list_curated_gguf_models() -> Vec<CuratedGGUFModel> {
    GGUFManager::get_curated_catalog()
}

#[tauri::command]
pub fn list_partial_gguf_downloads() -> Vec<PartialGGUFDownload> {
    GGUFManager::list_partial_downloads()
}

#[tauri::command]
pub fn list_installed_gguf_models() -> Vec<InstalledGGUFModel> {
    GGUFManager::list_installed()
}

#[tauri::command]
pub async fn download_gguf_model(model_id: String, window: tauri::Window) -> Result<String, String> {
    GGUFManager::download_model(model_id, window).await
}

#[tauri::command]
pub fn import_local_gguf(file_path: String) -> Result<InstalledGGUFModel, String> {
    GGUFManager::import_local_file(&file_path)
}

#[tauri::command]
pub fn delete_gguf_model(model_identifier: String) -> Result<(), String> {
    GGUFManager::delete_model(&model_identifier)
}

#[tauri::command]
pub fn get_llama_engine_status(state: tauri::State<AppState>) -> LlamaEngineStatus {
    state.llama_engine.get_status()
}

#[tauri::command]
pub async fn start_llama_engine(
    state: tauri::State<'_, AppState>,
    model_identifier: String,
) -> Result<(), String> {
    let path = GGUFManager::get_model_path(&model_identifier)
        .ok_or_else(|| format!("Modèle GGUF introuvable : {}", model_identifier))?;
    state.llama_engine.start(&path).await
}

#[tauri::command]
pub fn stop_llama_engine(state: tauri::State<AppState>) -> Result<(), String> {
    state.llama_engine.stop();
    Ok(())
}

#[tauri::command]
pub async fn list_models(
    state: tauri::State<'_, AppState>,
    base_url: Option<String>,
) -> Result<Vec<LLMModel>, String> {
    let mut all_models = Vec::new();

    // 1. Include all installed GGUF models
    for gguf in GGUFManager::list_installed() {
        let size_str = if gguf.size_bytes >= 1024 * 1024 * 1024 {
            format!("{:.1} GB", gguf.size_bytes as f64 / (1024.0 * 1024.0 * 1024.0))
        } else {
            format!("{:.0} MB", gguf.size_bytes as f64 / (1024.0 * 1024.0))
        };
        all_models.push(LLMModel {
            name: gguf.id,
            size: Some(size_str),
            modified_at: None,
        });
    }

    // 2. Include Ollama models if connected
    let url = {
        let settings = state.settings.lock().map_err(|e| e.to_string())?;
        base_url.unwrap_or_else(|| settings.ollama_base_url.clone())
    };
    if let Ok(ollama_models) = crate::llm::list_models(&url).await {
        for m in ollama_models {
            if !all_models.iter().any(|existing| existing.name == m.name) {
                all_models.push(m);
            }
        }
    }

    Ok(all_models)
}

#[tauri::command]
pub async fn pull_model(
    model: String,
    window: tauri::Window,
    base_url: Option<String>,
) -> Result<(), String> {
    if let Some(gguf_id) = GGUFManager::resolve_model_id(&model) {
        GGUFManager::download_model(gguf_id, window).await?;
        return Ok(());
    }

    let url = base_url.unwrap_or_else(|| "http://localhost:11434".to_string());
    crate::llm::pull_model(&url, &model, window)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_ollama_connection(
    state: tauri::State<'_, AppState>,
    base_url: Option<String>,
) -> Result<bool, String> {
    if !GGUFManager::list_installed().is_empty() {
        return Ok(true);
    }
    if state.llama_engine.is_running() {
        return Ok(true);
    }

    let url = {
        let settings = state.settings.lock().map_err(|e| e.to_string())?;
        base_url.unwrap_or_else(|| settings.ollama_base_url.clone())
    };
    crate::llm::check_connection(&url).await.map_err(|e| e.to_string())
}
