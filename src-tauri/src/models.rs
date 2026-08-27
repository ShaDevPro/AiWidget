use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub model: String,
    pub is_pinned: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Conversation {
    pub fn new(title: String, model: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            title,
            model,
            is_pinned: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "webSources")]
    pub web_sources: Option<Vec<WebSource>>,
    /// Full prompt sent to the LLM (e.g. with embedded document). UI uses `content`.
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "llmContent")]
    pub llm_content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSource {
    pub title: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageInput {
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "webSources")]
    pub web_sources: Option<Vec<WebSource>>,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "llmContent")]
    pub llm_content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub language: String,
    pub ollama_base_url: String,
    pub temperature: f32,
    pub max_tokens: u32,
    pub default_model: String,
    pub theme: String,
    #[serde(default)]
    pub voice_enabled: bool,
    #[serde(default = "default_true")]
    pub voice_auto_speak: bool,
    #[serde(default)]
    pub voice_continuous_mode: bool,
    #[serde(default = "default_voice_id")]
    pub voice_id: String,
    #[serde(default = "default_voice_speed")]
    pub voice_speed: f32,
    #[serde(default = "default_whisper_model")]
    pub whisper_model: String,
    #[serde(default = "default_execution_mode")]
    pub execution_mode: String,
    #[serde(default = "default_server_url")]
    pub server_url: String,
    #[serde(default)]
    pub server_auth_token: String,
}

fn default_true() -> bool { true }
fn default_voice_id() -> String { "fr-BE-GerardNeural".to_string() }
fn default_voice_speed() -> f32 { 1.0 }
fn default_whisper_model() -> String { "base".to_string() }
fn default_execution_mode() -> String { "lite".to_string() }
fn default_server_url() -> String { "http://localhost:8080".to_string() }

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            language: "fr".to_string(),
            ollama_base_url: "http://localhost:11434".to_string(),
            temperature: 0.7,
            max_tokens: 2048,
            default_model: "qwen2.5:1.5b".to_string(),
            theme: "light".to_string(),
            voice_enabled: false,
            voice_auto_speak: true,
            voice_continuous_mode: false,
            voice_id: "fr-BE-GerardNeural".to_string(),
            voice_speed: 1.0,
            whisper_model: "base".to_string(),
            execution_mode: "lite".to_string(),
            server_url: "http://localhost:8080".to_string(),
            server_auth_token: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMModel {
    pub name: String,
    pub size: Option<String>,
    pub modified_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserMemory {
    pub id: String,
    pub category: String, // "preference", "fact", "project", "work"
    pub key: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl UserMemory {
    pub fn new(category: String, key: String, content: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            category,
            key,
            content,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RAGDocument {
    pub id: String,
    pub filename: String,
    pub filepath: String,
    pub file_type: String,
    pub size_bytes: i64,
    pub chunk_count: usize,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RAGChunk {
    pub id: String,
    pub document_id: String,
    pub chunk_index: usize,
    pub content: String,
    pub metadata: String, // e.g. page number or section
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RAGSearchResult {
    pub document_id: String,
    pub document_name: String,
    pub chunk_index: usize,
    pub content: String,
    pub score: f64,
    pub metadata: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSearchResult {
    pub title: String,
    pub snippet: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserQuota {
    pub profile_id: String,
    pub is_admin: bool,
    pub daily_limit: u32,
    pub used_today: u32,
    pub remaining_today: u32,
    pub reset_date: String,
    pub is_exceeded: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorDBStats {
    pub total_documents: usize,
    pub total_chunks: usize,
    pub dimensions: usize,
    pub is_ready: bool,
    pub memory_bytes: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RAGSemanticSearchResult {
    pub document_id: String,
    pub document_name: String,
    pub chunk_index: usize,
    pub content: String,
    pub similarity: f32,
    pub similarity_pct: u32,
    pub metadata: String,
}
