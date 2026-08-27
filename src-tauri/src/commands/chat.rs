use crate::AppState;
use std::time::Duration;
use tauri::Manager;



const RAG_TOP_K: usize = 2;

const WEB_SEARCH_TIMEOUT: Duration = Duration::from_secs(3);



fn load_rag_and_memory(app: &tauri::AppHandle, query: Option<String>) -> (String, String) {

    let state = app.state::<AppState>();

    let Ok(db_guard) = state.db.lock() else {

        return (String::new(), String::new());

    };

    let Some(ref db) = *db_guard else {

        return (String::new(), String::new());

    };



    let rag = query

        .as_ref()

        .and_then(|q| db.search_rag_fts(q, RAG_TOP_K).ok())

        .filter(|r| !r.is_empty())

        .map(|r| crate::rag_engine::RAGEngine::format_context_snippet(&r))

        .unwrap_or_default();

    let memory = crate::memory_engine::MemoryEngine::get_formatted_memories(db);

    (rag, memory)

}



async fn fetch_web_context(query: &str) -> (String, Vec<crate::models::WebSearchResult>) {

    match crate::web_search::WebSearchEngine::search_with_timeout(query, 4, WEB_SEARCH_TIMEOUT).await

    {

        Ok(results) if !results.is_empty() => {

            let ctx = crate::web_search::WebSearchEngine::format_web_context(&results);

            (ctx, results)

        }

        _ => (String::new(), Vec::new()),

    }

}



fn schedule_extract_facts(app: tauri::AppHandle, query: String) {
    std::thread::spawn(move || {
        let state = app.state::<AppState>();
        if let Ok(guard) = state.db.lock() {
            if let Some(ref db) = *guard {
                crate::memory_engine::MemoryEngine::extract_and_save_facts(db, &query);
            }
        };
    });
}



fn finish_with_deferred_facts(

    app: tauri::AppHandle,

    query: Option<String>,

    result: Result<String, String>,

) -> Result<String, String> {

    if result.is_ok() {

        if let Some(q) = query {

            schedule_extract_facts(app, q);

        }

    }

    result

}



#[tauri::command]

pub async fn generate_response(

    state: tauri::State<'_, AppState>,

    model: String,

    mut messages: Vec<crate::models::ChatMessage>,

    temperature: Option<f32>,

    max_tokens: Option<u32>,

    window: tauri::Window,

    base_url: Option<String>,

    enable_web_search: Option<bool>,

) -> Result<String, String> {

    state.generation_controller.reset();



    // ── Read settings (lock released immediately) ─────────────────

    let (url, temp, max) = {

        let settings = state.settings.lock().map_err(|e| e.to_string())?;

        let url = base_url.unwrap_or_else(|| settings.ollama_base_url.clone());

        let temp = temperature.unwrap_or(settings.temperature);

        let max = max_tokens.unwrap_or(settings.max_tokens);

        (url, temp, max)

    };



    // ── 0. Check & increment quota ────────────────────────────────

    {

        let (profile_id, is_admin) = {

            let prof_guard = state.active_profile.lock().map_err(|e| e.to_string())?;

            if let Some(ref p) = *prof_guard {

                (p.id.clone(), p.role == "admin")

            } else {

                ("default".to_string(), false)

            }

        };



        let db_guard = state.db.lock().map_err(|e| e.to_string())?;

        if let Some(ref db) = *db_guard {

            let quota = crate::quota_service::QuotaService::increment(db, &profile_id, is_admin)?;

            if quota.is_exceeded {

                return Err("ERR_QUOTA_EXCEEDED".to_string());

            }

            let _ = window.emit("quota-updated", &quota);

        }

    }



    // ── 1. Resolve contextual query ───────────────────────────────

    let contextual_query =

        crate::web_search::WebSearchEngine::resolve_contextual_query(&messages);

    let query_for_facts = contextual_query.clone();

    let app_handle = window.app_handle();

    let should_search_web = enable_web_search.unwrap_or(false);



    // ── 2–5. RAG + mémoire (DB) en parallèle avec web search ───────

    let query_for_db = contextual_query.clone();

    let db_app = app_handle.clone();

    let db_fut = async move {

        tokio::task::spawn_blocking(move || load_rag_and_memory(&db_app, query_for_db))

            .await

            .unwrap_or((String::new(), String::new()))

    };



    let web_fut = async {

        if should_search_web {

            if let Some(ref q) = contextual_query {

                return fetch_web_context(q).await;

            }

        }

        (String::new(), Vec::new())

    };



    let ((rag_context, memory_context), (web_context, web_results_for_ui)) =

        tokio::join!(db_fut, web_fut);



    if !web_results_for_ui.is_empty() {

        let sources: Vec<serde_json::Value> = web_results_for_ui

            .iter()

            .filter(|r| !r.url.is_empty())

            .map(|r| {

                serde_json::json!({

                    "title": r.title,

                    "url": r.url,

                })

            })

            .collect();

        if !sources.is_empty() {

            let _ = window.emit("chat-web-sources", serde_json::json!({ "sources": sources }));

        }

    }



    // ── 6. Enrich system message ───────────────────────────────────
    let lang = {
        let settings = state.settings.lock().map_err(|e| e.to_string())?;
        settings.language.clone()
    };
    let temporal_block = crate::grounding::Grounding::temporal_system_block(&lang);

    if !messages.is_empty() && messages[0].role == "system" {
        messages[0].content.push_str(&temporal_block);
        if !memory_context.is_empty() {
            messages[0]
                .content
                .push_str(&format!("\n\n{}", memory_context));
        }
        if should_search_web {
            messages[0].content.push_str(crate::grounding::Grounding::web_mode_hint());
        } else {
            messages[0].content.push_str(crate::grounding::Grounding::offline_mode_hint());
        }
    } else {
        let mode_hint = if should_search_web {
            crate::grounding::Grounding::web_mode_hint()
        } else {
            crate::grounding::Grounding::offline_mode_hint()
        };
        messages.insert(
            0,
            crate::models::ChatMessage {
                role: "system".to_string(),
                content: format!("{}{}{}", temporal_block, memory_context, mode_hint),
                images: None,
            },
        );
    }



    // ── 7. Attach RAG + web context to last user message ──────────

    if !rag_context.is_empty() || !web_context.is_empty() {

        if let Some(last_user_msg) = messages.iter_mut().rev().find(|m| m.role == "user") {

            last_user_msg.content.push_str(&rag_context);

            last_user_msg.content.push_str(&web_context);

        }

    }



    // ── 8. Apply sliding context budget ───────────────────────────
    let hw = crate::hardware_detector::HardwareDetector::detect();
    let num_ctx = crate::hardware_detector::HardwareDetector::recommended_num_ctx(&hw) as usize;
    let messages =
        crate::memory_engine::MemoryEngine::build_sliding_context(&messages, num_ctx, max);



    // ── 9. Route to GGUF or Ollama ────────────────────────────────

    let cancel = state.generation_controller.clone();

    if let Some(model_path) = crate::gguf_manager::GGUFManager::get_model_path(&model) {

        state.llama_engine.start(&model_path).await?;

        let llama_messages: Vec<crate::llama_engine::ChatMessage> = messages

            .into_iter()

            .map(|m| crate::llama_engine::ChatMessage {

                role: m.role,

                content: m.content,

            })

            .collect();

        return finish_with_deferred_facts(

            app_handle,

            query_for_facts,

            state

                .llama_engine

                .chat_stream(llama_messages, temp, max, window, cancel)

                .await,

        );

    }



    // ── Fast path: direct chat without redundant pre-flight roundtrips ───
    let resolved_model = crate::llm::resolve_model_name(&url, &model).await;

    if let Ok(res) = crate::llm::chat(

        &url,

        &resolved_model,

        messages.clone(),

        temp,

        max,

        window.clone(),

        cancel.clone(),

    )

    .await

    {

        return finish_with_deferred_facts(app_handle, query_for_facts, Ok(res));

    }



    if let Ok(true) = crate::llm::check_connection(&url).await {

        return finish_with_deferred_facts(

            app_handle,

            query_for_facts,

            crate::llm::chat(&url, &resolved_model, messages, temp, max, window, cancel)

                .await

                .map_err(|e| e.to_string()),

        );

    }



    // Fallback: first installed GGUF model

    let installed = crate::gguf_manager::GGUFManager::list_installed();

    if let Some(first) = installed.first() {

        if let Some(path) = crate::gguf_manager::GGUFManager::get_model_path(&first.filename) {

            state.llama_engine.start(&path).await?;

            let llama_messages: Vec<crate::llama_engine::ChatMessage> = messages

                .into_iter()

                .map(|m| crate::llama_engine::ChatMessage {

                    role: m.role,

                    content: m.content,

                })

                .collect();

            return finish_with_deferred_facts(

                app_handle,

                query_for_facts,

                state

                    .llama_engine

                    .chat_stream(llama_messages, temp, max, window, cancel)

                    .await,

            );

        }

    }



    Err("Aucun modèle GGUF installé ou serveur Ollama connecté.".into())

}

