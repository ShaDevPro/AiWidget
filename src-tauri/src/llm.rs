use anyhow::{anyhow, Context, Result};
use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;
use tauri::Window;

use crate::models::{ChatMessage, LLMModel};
use crate::generation_controller::{GenerationController, ERR_GENERATION_CANCELLED};
use crate::token_emitter::ChatTokenBatcher;

#[derive(Debug, Deserialize)]
struct OllamaModel {
    name: String,
    size: Option<i64>,
    modified_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ModelsResponse {
    models: Vec<OllamaModel>,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    message: Option<ChatMsg>,
    done: bool,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ChatMsg {
    #[allow(dead_code)]
    role: String,
    content: String,
}

fn format_size(bytes: i64) -> String {
    const GB: f64 = 1024.0 * 1024.0 * 1024.0;
    const MB: f64 = 1024.0 * 1024.0;
    let b = bytes as f64;
    if b >= GB {
        format!("{:.2} GB", b / GB)
    } else {
        format!("{:.1} MB", b / MB)
    }
}

fn build_client() -> Result<Client> {
    Client::builder()
        .timeout(Duration::from_secs(600))
        .connect_timeout(Duration::from_secs(10))
        .build()
        .context("Failed to build HTTP client")
}

pub async fn check_connection(base_url: &str) -> Result<bool> {
    let client = build_client()?;
    let url = format!("{}/api/tags", base_url.trim_end_matches('/'));
    match client.get(&url).send().await {
        Ok(res) => Ok(res.status().is_success()),
        Err(_) => Ok(false),
    }
}

pub async fn list_models(base_url: &str) -> Result<Vec<LLMModel>> {
    let client = build_client()?;
    let url = format!("{}/api/tags", base_url.trim_end_matches('/'));
    let resp = client
        .get(&url)
        .send()
        .await
        .context("Failed to connect to Ollama. Is it running?")?;
    
    if !resp.status().is_success() {
        return Err(anyhow!(
            "Ollama returned status {}: {}",
            resp.status(),
            resp.text().await.unwrap_or_default()
        ));
    }

    let data: ModelsResponse = resp.json().await.context("Invalid response from Ollama")?;
    let models = data
        .models
        .into_iter()
        .map(|m| LLMModel {
            name: m.name,
            size: m.size.map(format_size),
            modified_at: m.modified_at,
        })
        .collect();
    Ok(models)
}

#[derive(Serialize)]
struct PullRequest {
    name: String,
    stream: bool,
}

pub async fn pull_model(base_url: &str, model: &str, window: Window) -> Result<()> {
    let client = build_client()?;
    let url = format!("{}/api/pull", base_url.trim_end_matches('/'));
    let body = PullRequest {
        name: model.to_string(),
        stream: true,
    };

    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .context("Failed to send pull request to Ollama")?;

    if !resp.status().is_success() {
        return Err(anyhow!(
            "Failed to pull model: {} - {}",
            resp.status(),
            resp.text().await.unwrap_or_default()
        ));
    }

    let mut stream = resp.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.context("Stream error")?;
        let text = String::from_utf8_lossy(&chunk);
        for line in text.trim().split('\n') {
            if line.trim().is_empty() {
                continue;
            }
            if let Ok(v) = serde_json::from_str::<Value>(line) {
                let _ = window.emit("model-pull-progress", v);
            }
        }
    }
    Ok(())
}

pub async fn resolve_model_name(base_url: &str, requested: &str) -> String {
    if let Ok(models) = list_models(base_url).await {
        if models.is_empty() {
            return requested.to_string();
        }
        // 1. Exact match
        if models.iter().any(|m| m.name.eq_ignore_ascii_case(requested)) {
            return requested.to_string();
        }
        // 2. Match by prefix before ':' (e.g. "mistral" -> "mistral:7b")
        let req_prefix = requested.split(':').next().unwrap_or(requested);
        if let Some(matched) = models.iter().find(|m| {
            let m_prefix = m.name.split(':').next().unwrap_or(&m.name);
            m_prefix.eq_ignore_ascii_case(req_prefix)
        }) {
            return matched.name.clone();
        }
        // 3. Substring match
        if let Some(matched) = models.iter().find(|m| {
            m.name.to_lowercase().contains(&requested.to_lowercase())
        }) {
            return matched.name.clone();
        }
        // 4. Default to first installed model
        if let Some(first) = models.first() {
            return first.name.clone();
        }
    }
    requested.to_string()
}

pub async fn chat(
    base_url: &str,
    model: &str,
    messages: Vec<ChatMessage>,
    temperature: f32,
    max_tokens: u32,
    window: Window,
    cancel: GenerationController,
) -> Result<String> {
    let client = build_client()?;
    let url = format!("{}/api/chat", base_url.trim_end_matches('/'));

    let hw = crate::hardware_detector::HardwareDetector::detect();
    let num_threads = hw.cpu_cores.max(2).min(16);
    let num_ctx = crate::hardware_detector::HardwareDetector::recommended_num_ctx(&hw).max(4096);
    let num_predict = max_tokens.clamp(128, 4096);

    let body = json!({
        "model": model,
        "messages": messages,
        "stream": true,
        "keep_alive": "60m",
        "options": {
            "temperature": temperature,
            "num_predict": num_predict,
            "num_ctx": num_ctx,
            "num_batch": 512,
            "num_thread": num_threads,
            "top_k": 40,
            "top_p": 0.9,
            "repeat_penalty": 1.1,
            "low_vram": !hw.has_discrete_gpu,
            "f16_kv": true,
            "use_mmap": true,
        }
    });

    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .context("Failed to connect to Ollama. Make sure Ollama is running locally.")?;

    if !resp.status().is_success() {
        return Err(anyhow!(
            "Ollama request failed ({}): {}",
            resp.status(),
            resp.text().await.unwrap_or_else(|_| String::from("unknown error"))
        ));
    }

    let mut full_response = String::new();
    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();
    let mut token_batcher = ChatTokenBatcher::new(window.clone());

    while let Some(chunk) = stream.next().await {
        if cancel.is_cancelled() {
            drop(stream);
            token_batcher.flush_cancelled();
            return Err(anyhow!(ERR_GENERATION_CANCELLED));
        }

        let chunk = chunk.context("Error reading stream from Ollama")?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buffer.find('\n') {
            let line: String = buffer.drain(..=pos).collect();
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            match serde_json::from_str::<ChatResponse>(line) {
                Ok(chat_resp) => {
                    if let Some(err) = chat_resp.error {
                        return Err(anyhow!("Ollama error: {}", err));
                    }
                    if let Some(msg) = chat_resp.message {
                        if !msg.content.is_empty() {
                            full_response.push_str(&msg.content);
                            token_batcher.push(&msg.content, chat_resp.done);
                        } else if chat_resp.done {
                            token_batcher.push("", true);
                        }
                    } else if chat_resp.done {
                        token_batcher.push("", true);
                    }
                }
                Err(e) => {
                    eprintln!("Failed to parse chat line: {}", e);
                }
            }
        }
    }

    token_batcher.push("", true);

    Ok(full_response)
}

pub async fn chat_stream_channel(
    model: &str,
    messages: &[ChatMessage],
    temperature: f32,
    max_tokens: u32,
    base_url: &str,
    sender: tokio::sync::mpsc::UnboundedSender<String>,
) -> Result<String, String> {
    let client = build_client().map_err(|e| e.to_string())?;
    let resolved_model = resolve_model_name(base_url, model).await;
    let url = format!("{}/api/chat", base_url.trim_end_matches('/'));

    let body = json!({
        "model": resolved_model,
        "messages": messages,
        "stream": true,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        }
    });

    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Ollama request failed with status {}", resp.status()));
    }

    let mut full_response = String::new();
    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buffer.find('\n') {
            let line: String = buffer.drain(..=pos).collect();
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            if let Ok(chat_resp) = serde_json::from_str::<ChatResponse>(line) {
                if let Some(err) = chat_resp.error {
                    return Err(format!("Ollama error: {}", err));
                }
                if let Some(msg) = chat_resp.message {
                    if !msg.content.is_empty() {
                        full_response.push_str(&msg.content);
                        let _ = sender.send(msg.content);
                    }
                }
            }
        }
    }

    Ok(full_response)
}

/// Non-streaming completion for routing / classification (no chat-token events).
pub async fn chat_complete(
    base_url: &str,
    model: &str,
    messages: Vec<ChatMessage>,
    temperature: f32,
    max_tokens: u32,
) -> Result<String> {
    let client = build_client()?;
    let resolved = resolve_model_name(base_url, model).await;
    let url = format!("{}/api/chat", base_url.trim_end_matches('/'));

    let body = json!({
        "model": resolved,
        "messages": messages,
        "stream": false,
        "keep_alive": "5m",
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
            "num_ctx": 2048,
        }
    });

    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .context("Failed to connect to Ollama for classification")?;

    if !resp.status().is_success() {
        return Err(anyhow!(
            "Ollama classification failed ({}): {}",
            resp.status(),
            resp.text().await.unwrap_or_default()
        ));
    }

    let data: ChatResponse = resp.json().await.context("Invalid Ollama classification response")?;
    if let Some(err) = data.error {
        return Err(anyhow!("Ollama error: {}", err));
    }
    Ok(data
        .message
        .map(|m| m.content)
        .unwrap_or_default())
}
