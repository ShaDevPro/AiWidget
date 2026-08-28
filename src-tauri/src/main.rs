#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// ── Core engine modules ───────────────────────────────────────────
mod db;
mod gguf_manager;
mod llama_engine;
mod llm;
mod memory_engine;
mod models;
mod ollama_installer;
mod rag_engine;
mod ocr_engine;
mod tts_engine;
mod vector_db;
mod web_search;
mod web_intent;
mod weather_engine;
mod vision;
mod generation_controller;
mod grounding;
mod token_emitter;
mod whisper_engine;
mod sd_engine;
mod hardware_detector;
mod quota_service;
pub mod enterprise_policy;
pub mod license_engine;
pub mod security_engine;
pub mod integrity_verifier;
pub mod core;

use integrity_verifier::{IntegrityVerifier, IntegrityStatus};

// ── Command modules ───────────────────────────────────────────────
mod commands;

use commands::chat::generate_response;
use commands::quota::{get_user_quota, set_user_quota_limit};
use commands::policy::get_enterprise_policy;
use commands::license::{get_hardware_id, get_license_status, activate_license_key, deactivate_license, generate_license_key_admin};
use commands::image::{get_sd_status, download_sd, generate_image_sd, open_sd_folder};
use commands::conversations::{
    create_conversation, delete_conversation, delete_message, delete_messages_from, get_conversations, get_messages,
    save_message, search_messages, toggle_conversation_pin, update_conversation_title,
};
use commands::memory::{clear_user_memories, delete_user_memory, get_user_memories, save_user_memory};
use commands::models_cmd::{
    check_ollama_connection, delete_gguf_model, download_gguf_model, get_llama_engine_status,
    import_local_gguf, list_curated_gguf_models, list_installed_gguf_models, list_partial_gguf_downloads, list_models,
    pull_model, start_llama_engine, stop_llama_engine,
};
use commands::ollama::{check_ollama_status, install_ollama, start_ollama};
use commands::profile::{
    create_admin_profile, create_profile, delete_profile, generate_master_key,
    admin_clear_user_conversations, admin_delete_user, admin_ban_user, admin_unban_user,
    clear_my_conversations,
    delete_my_account, get_active_profile, get_avatar_data_url, get_secret_questions,
    is_first_launch, list_profiles, login, logout, reset_password_with_master_key,
    reset_password_with_questions, update_profile, upload_avatar, verify_secret_questions,
};
use commands::rag::{
    clear_rag_documents, delete_rag_document, extract_document_text, index_rag_document,
    list_rag_documents, ocr_extract_image, read_image_base64, search_rag, search_rag_semantic, get_vector_db_stats, reindex_rag_vectors,
};
use commands::search::perform_web_search;
use commands::web_intent::classify_web_intent;
use commands::generation::cancel_generation;
use commands::settings::{get_autostart_status, get_settings, save_settings, set_autostart_status};
use commands::voice::{download_whisper, get_whisper_status, list_tts_voices, synthesize_speech, transcribe_audio};
use commands::widget::{
    widget_center, widget_close, widget_maximize, widget_minimize, widget_resize,
    widget_set_pin, widget_start_drag, widget_toggle_pin,
};

use db::Database;
use generation_controller::GenerationController;
use llama_engine::LlamaEngine;
use std::sync::{Arc, Mutex};

// ── Shared application state ──────────────────────────────────────
// db is Option<Database> — None when no profile is logged in.
pub struct AppState {
    pub db: Mutex<Option<Database>>,
    pub settings: Mutex<models::AppSettings>,
    pub is_pinned: Mutex<bool>,
    pub llama_engine: Arc<LlamaEngine>,
    pub active_profile: Mutex<Option<commands::profile::ProfilePublic>>,
    pub generation_controller: GenerationController,
}

#[tauri::command]
async fn verify_app_integrity(active_license_key: Option<String>) -> IntegrityStatus {
    IntegrityVerifier::verify(active_license_key).await
}

// ── Entry point ───────────────────────────────────────────────────
fn main() {
    LlamaEngine::kill_all_orphans();
    let llama_engine = Arc::new(LlamaEngine::default());

    // Load settings from the global fallback path (used before any profile login)
    let global_settings_path = dirs::data_local_dir()
        .map(|p| p.join("aiwidget").join("global_settings.json"))
        .unwrap_or_else(|| std::path::PathBuf::from("global_settings.json"));
    let settings = if global_settings_path.exists() {
        let data = std::fs::read_to_string(&global_settings_path).unwrap_or_default();
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        models::AppSettings::default()
    };

    tauri::Builder::default()
        .manage(AppState {
            db: Mutex::new(None), // No DB until a profile logs in
            settings: Mutex::new(settings),
            is_pinned: Mutex::new(false),
            llama_engine,
            active_profile: Mutex::new(None),
            generation_controller: GenerationController::default(),
        })
        .invoke_handler(tauri::generate_handler![
            // ── Profile system ────────────────────────────────────
            is_first_launch,
            list_profiles,
            generate_master_key,
            create_admin_profile,
            create_profile,
            login,
            logout,
            get_active_profile,
            update_profile,
            delete_profile,
            upload_avatar,
            verify_secret_questions,
            reset_password_with_questions,
            reset_password_with_master_key,
            get_secret_questions,
            get_avatar_data_url,
            admin_delete_user,
            admin_clear_user_conversations,
            admin_ban_user,
            admin_unban_user,
            clear_my_conversations,
            delete_my_account,
            // ── GGUF / Local models ───────────────────────────────
            list_curated_gguf_models,
            list_partial_gguf_downloads,
            list_installed_gguf_models,
            download_gguf_model,
            import_local_gguf,
            delete_gguf_model,
            get_llama_engine_status,
            start_llama_engine,
            stop_llama_engine,
            // ── Conversations & messages ──────────────────────────
            get_conversations,
            create_conversation,
            delete_conversation,
            toggle_conversation_pin,
            update_conversation_title,
            get_messages,
            save_message,
            delete_message,
            delete_messages_from,
            search_messages,
            // ── Settings ─────────────────────────────────────────
            get_settings,
            save_settings,
            get_autostart_status,
            set_autostart_status,
            // ── Memory ───────────────────────────────────────────
            get_user_memories,
            save_user_memory,
            delete_user_memory,
            clear_user_memories,
            // ── RAG, Vector DB & OCR ─────────────────────────────
            list_rag_documents,
            index_rag_document,
            delete_rag_document,
            clear_rag_documents,
            search_rag,
            search_rag_semantic,
            get_vector_db_stats,
            reindex_rag_vectors,
            ocr_extract_image,
            read_image_base64,
            extract_document_text,
            // ── Web search ────────────────────────────────────────
            perform_web_search,
            classify_web_intent,
            // ── LLM / Ollama ──────────────────────────────────────
            list_models,
            pull_model,
            check_ollama_connection,
            check_ollama_status,
            start_ollama,
            install_ollama,
            generate_response,
            cancel_generation,
            // ── Widget window controls ────────────────────────────
            widget_toggle_pin,
            widget_set_pin,
            widget_minimize,
            widget_maximize,
            widget_close,
            widget_resize,
            widget_start_drag,
            widget_center,
            // ── Voice ─────────────────────────────────────────────
            list_tts_voices,
            synthesize_speech,
            transcribe_audio,
            get_whisper_status,
            download_whisper,
            // ── Stable Diffusion Image Studio ─────────────────────
            get_sd_status,
            download_sd,
            generate_image_sd,
            open_sd_folder,
            // ── Stats & weather ───────────────────────────────────
            commands::sysinfo::get_system_stats,
            commands::sysinfo::get_weather,
            commands::sysinfo::get_weather_for_city,
            // ── Hardware detection ────────────────────────────────
            hardware_detector::get_hardware_specs,
            // ── User quotas ───────────────────────────────────────
            get_user_quota,
            set_user_quota_limit,
            // ── Enterprise Policy & Lockdown ──────────────────────
            get_enterprise_policy,
            // ── Cryptographic License & Integrity System ────────
            get_hardware_id,
            get_license_status,
            activate_license_key,
            deactivate_license,
            generate_license_key_admin,
            verify_app_integrity,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
