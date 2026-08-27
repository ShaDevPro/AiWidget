use crate::models::WebSearchResult;

#[tauri::command]
pub async fn perform_web_search(
    query: String,
    max_results: Option<usize>,
) -> Result<Vec<WebSearchResult>, String> {
    crate::web_search::WebSearchEngine::search(&query, max_results.unwrap_or(4))
        .await
        .map_err(|e| e.to_string())
}
