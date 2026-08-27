use async_trait::async_trait;
use std::sync::Arc;
use crate::core::traits::ChatRepository;
use crate::db::Database;
use crate::models::{Conversation, Message, MessageInput};

pub struct SqliteChatRepository {
    pub db: Arc<Database>,
}

impl SqliteChatRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }
}

#[async_trait]
impl ChatRepository for SqliteChatRepository {
    async fn get_conversations(&self) -> Result<Vec<Conversation>, String> {
        self.db.get_conversations().map_err(|e| e.to_string())
    }

    async fn create_conversation(&self, title: &str, model: &str) -> Result<Conversation, String> {
        let conv = Conversation::new(title.to_string(), model.to_string());
        self.db.save_conversation(&conv).map_err(|e| e.to_string())?;
        Ok(conv)
    }

    async fn update_conversation_title(&self, id: &str, title: &str) -> Result<(), String> {
        self.db.update_conversation_title(id, title).map_err(|e| e.to_string())
    }

    async fn toggle_conversation_pin(&self, id: &str) -> Result<bool, String> {
        self.db.toggle_conversation_pin(id).map_err(|e| e.to_string())
    }

    async fn delete_conversation(&self, id: &str) -> Result<(), String> {
        self.db.delete_conversation(id).map_err(|e| e.to_string())
    }

    async fn get_messages(&self, conversation_id: &str) -> Result<Vec<Message>, String> {
        self.db.get_messages(conversation_id).map_err(|e| e.to_string())
    }

    async fn save_message(&self, input: MessageInput) -> Result<Message, String> {
        let msg = Message {
            id: uuid::Uuid::new_v4().to_string(),
            conversation_id: input.conversation_id,
            role: input.role,
            content: input.content,
            created_at: chrono::Utc::now(),
            web_sources: input.web_sources,
            llm_content: input.llm_content,
        };
        self.db.save_message(&msg).map_err(|e| e.to_string())?;
        Ok(msg)
    }

    async fn clear_conversations(&self) -> Result<(), String> {
        self.db.clear_conversations().map_err(|e| e.to_string())
    }
}
