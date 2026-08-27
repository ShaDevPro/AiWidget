use crate::AppState;
use crate::models::{Conversation, Message, MessageInput};
use uuid::Uuid;

#[tauri::command]
pub fn get_conversations(state: tauri::State<AppState>) -> Result<Vec<Conversation>, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.get_conversations().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_conversation(state: tauri::State<AppState>, title: String, model: String) -> Result<Conversation, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    let conv = Conversation::new(title, model);
    db.save_conversation(&conv).map_err(|e| e.to_string())?;
    Ok(conv)
}

#[tauri::command]
pub fn delete_conversation(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.delete_conversation(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_conversation_pin(state: tauri::State<AppState>, id: String) -> Result<bool, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.toggle_conversation_pin(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_conversation_title(state: tauri::State<AppState>, id: String, title: String) -> Result<(), String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.update_conversation_title(&id, &title).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_messages(state: tauri::State<AppState>, conversation_id: String) -> Result<Vec<Message>, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.get_messages(&conversation_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_message(state: tauri::State<AppState>, message: MessageInput) -> Result<Message, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    let msg = Message {
        id: Uuid::new_v4().to_string(),
        conversation_id: message.conversation_id,
        role: message.role,
        content: message.content,
        created_at: chrono::Utc::now(),
        web_sources: message.web_sources,
        llm_content: message.llm_content,
    };
    db.save_message(&msg).map_err(|e| e.to_string())?;
    Ok(msg)
}

#[tauri::command]
pub fn delete_message(state: tauri::State<AppState>, id: String) -> Result<(), String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.delete_message(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_messages_from(
    state: tauri::State<AppState>,
    conversation_id: String,
    from_created_at: String,
) -> Result<(), String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    db.delete_messages_from(&conversation_id, &from_created_at)
        .map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
pub struct MessageSearchResult {
    pub message_id: String,
    pub conversation_id: String,
    pub conversation_title: String,
    pub snippet: String,
}

#[tauri::command]
pub fn search_messages(state: tauri::State<AppState>, query: String) -> Result<Vec<MessageSearchResult>, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in. Please log in first.")?;
    let raw = db.search_messages(&query).map_err(|e| e.to_string())?;
    let results = raw
        .into_iter()
        .map(|(msg_id, conv_id, title, content)| {
            let snippet = if content.len() > 120 {
                format!("{}...", &content[..120])
            } else {
                content
            };
            MessageSearchResult {
                message_id: msg_id,
                conversation_id: conv_id,
                conversation_title: title,
                snippet,
            }
        })
        .collect();
    Ok(results)
}
