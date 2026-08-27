use crate::AppState;
use crate::models::{RAGDocument, RAGSearchResult};

#[tauri::command]
pub fn list_rag_documents(state: tauri::State<AppState>) -> Result<Vec<RAGDocument>, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.get_rag_documents().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn index_rag_document(
    state: tauri::State<AppState>,
    file_path: String,
    file_bytes: Option<Vec<u8>>,
) -> Result<RAGDocument, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    crate::rag_engine::RAGEngine::index_document(&db, &file_path, file_bytes).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_rag_document(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.delete_rag_document(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_rag_documents(state: tauri::State<AppState>) -> Result<(), String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.clear_rag_documents().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_rag(
    state: tauri::State<AppState>,
    query: String,
    top_k: Option<usize>,
) -> Result<Vec<RAGSearchResult>, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.search_rag_fts(&query, top_k.unwrap_or(4)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn ocr_extract_image(image_path_or_base64: String) -> Result<String, String> {
    if image_path_or_base64.starts_with("data:image/") || image_path_or_base64.len() > 500 {
        crate::ocr_engine::OCREngine::extract_from_base64(&image_path_or_base64)
            .map_err(|e| e.to_string())
    } else {
        let path = std::path::Path::new(&image_path_or_base64);
        crate::ocr_engine::OCREngine::extract_from_path(path)
            .map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn read_image_base64(file_path: String) -> Result<String, String> {
    let path = std::path::Path::new(&file_path);
    crate::vision::read_image_file_base64(path)
}

#[tauri::command]
pub fn extract_document_text(file_path: String, file_bytes: Option<Vec<u8>>) -> Result<String, String> {
    let path = std::path::Path::new(&file_path);
    crate::rag_engine::RAGEngine::extract_text(path, file_bytes.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_rag_semantic(
    state: tauri::State<AppState>,
    query: String,
    top_k: Option<usize>,
    min_similarity: Option<f32>,
) -> Result<Vec<crate::models::RAGSemanticSearchResult>, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    crate::vector_db::VectorDB::search_semantic(&db, &query, top_k.unwrap_or(5), min_similarity.unwrap_or(0.15))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_vector_db_stats(state: tauri::State<AppState>) -> Result<crate::models::VectorDBStats, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    crate::vector_db::VectorDB::get_stats(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reindex_rag_vectors(state: tauri::State<AppState>) -> Result<usize, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.reindex_all_chunk_vectors().map_err(|e| e.to_string())
}
