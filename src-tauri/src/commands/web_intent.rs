use crate::web_intent::{WebIntentClassifier, WebIntentResult};
use crate::AppState;

#[tauri::command]
pub async fn classify_web_intent(
    state: tauri::State<'_, AppState>,
    query: String,
    model: Option<String>,
    base_url: Option<String>,
) -> Result<WebIntentResult, String> {
    let (url, default_model) = {
        let settings = state.settings.lock().map_err(|e| e.to_string())?;
        (
            base_url.unwrap_or_else(|| settings.ollama_base_url.clone()),
            settings.default_model.clone(),
        )
    };

    let model_name = model.unwrap_or(default_model);
    if model_name.is_empty() {
        return Ok(WebIntentResult::default());
    }

    let resolved = if crate::gguf_manager::GGUFManager::get_model_path(&model_name).is_some() {
        model_name.clone()
    } else if crate::llm::check_connection(&url).await.unwrap_or(false) {
        crate::llm::resolve_model_name(&url, &model_name).await
    } else {
        return Ok(WebIntentResult::default());
    };

    Ok(WebIntentClassifier::classify(&url, &resolved, &query).await)
}
