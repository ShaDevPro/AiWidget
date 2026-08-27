use async_trait::async_trait;
use tokio::sync::mpsc;
use crate::models::{
    ChatMessage, Conversation, LLMModel, Message, MessageInput, RAGChunk, RAGDocument,
    RAGSearchResult, UserMemory, UserQuota,
};

#[derive(Debug, Clone)]
pub struct CompletionOptions {
    pub temperature: f32,
    pub max_tokens: u32,
    pub stream: bool,
}

impl Default for CompletionOptions {
    fn default() -> Self {
        Self {
            temperature: 0.7,
            max_tokens: 2048,
            stream: true,
        }
    }
}

/// Abstraction pour les moteurs d'inférence (Local Ollama, Local GGUF, Serveur distant)
#[async_trait]
pub trait LLMProvider: Send + Sync {
    async fn list_models(&self) -> Result<Vec<LLMModel>, String>;
    async fn generate_stream(
        &self,
        model: &str,
        messages: &[ChatMessage],
        options: &CompletionOptions,
        token_sender: mpsc::UnboundedSender<String>,
    ) -> Result<String, String>;
}

/// Abstraction pour la persistance des conversations et messages
#[async_trait]
pub trait ChatRepository: Send + Sync {
    async fn get_conversations(&self) -> Result<Vec<Conversation>, String>;
    async fn create_conversation(&self, title: &str, model: &str) -> Result<Conversation, String>;
    async fn update_conversation_title(&self, id: &str, title: &str) -> Result<(), String>;
    async fn toggle_conversation_pin(&self, id: &str) -> Result<bool, String>;
    async fn delete_conversation(&self, id: &str) -> Result<(), String>;
    async fn get_messages(&self, conversation_id: &str) -> Result<Vec<Message>, String>;
    async fn save_message(&self, input: MessageInput) -> Result<Message, String>;
    async fn clear_conversations(&self) -> Result<(), String>;
}

/// Abstraction pour la mémoire conversationnelle
#[async_trait]
pub trait MemoryRepository: Send + Sync {
    async fn get_memories(&self) -> Result<Vec<UserMemory>, String>;
    async fn save_memory(&self, memory: UserMemory) -> Result<(), String>;
    async fn delete_memory(&self, id: &str) -> Result<(), String>;
    async fn clear_memories(&self) -> Result<(), String>;
}

/// Abstraction pour le stockage vectoriel et l'indexation RAG
#[async_trait]
pub trait VectorStore: Send + Sync {
    async fn list_documents(&self) -> Result<Vec<RAGDocument>, String>;
    async fn insert_document(&self, doc: RAGDocument, chunks: Vec<RAGChunk>) -> Result<(), String>;
    async fn delete_document(&self, id: &str) -> Result<(), String>;
    async fn clear_documents(&self) -> Result<(), String>;
    async fn search_similar(&self, query: &str, top_k: usize) -> Result<Vec<RAGSearchResult>, String>;
}

/// Abstraction pour la gestion des quotas utilisateurs
#[async_trait]
pub trait QuotaManager: Send + Sync {
    async fn get_quota(&self, profile_id: &str, is_admin: bool) -> Result<UserQuota, String>;
    async fn increment_quota(&self, profile_id: &str, is_admin: bool) -> Result<UserQuota, String>;
    async fn set_limit(&self, limit: u32) -> Result<(), String>;
}
