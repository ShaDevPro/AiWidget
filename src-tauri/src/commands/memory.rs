use crate::AppState;
use crate::models::{UserMemory};

#[tauri::command]
pub fn get_user_memories(state: tauri::State<AppState>) -> Result<Vec<UserMemory>, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.get_user_memories().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_user_memory(
    state: tauri::State<AppState>,
    category: String,
    key: String,
    content: String,
) -> Result<UserMemory, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    let memory = UserMemory::new(category, key, content);
    db.save_user_memory(&memory).map_err(|e| e.to_string())?;
    Ok(memory)
}

#[tauri::command]
pub fn delete_user_memory(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.delete_user_memory(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_user_memories(state: tauri::State<AppState>) -> Result<(), String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.clear_user_memories().map_err(|e| e.to_string())
}
