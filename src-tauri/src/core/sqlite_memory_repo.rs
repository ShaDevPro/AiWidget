use async_trait::async_trait;
use std::sync::Arc;
use crate::core::traits::MemoryRepository;
use crate::db::Database;
use crate::models::UserMemory;

pub struct SqliteMemoryRepository {
    pub db: Arc<Database>,
}

impl SqliteMemoryRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }
}

#[async_trait]
impl MemoryRepository for SqliteMemoryRepository {
    async fn get_memories(&self) -> Result<Vec<UserMemory>, String> {
        self.db.get_user_memories().map_err(|e| e.to_string())
    }

    async fn save_memory(&self, memory: UserMemory) -> Result<(), String> {
        self.db.save_user_memory(&memory).map_err(|e| e.to_string())
    }

    async fn delete_memory(&self, id: &str) -> Result<(), String> {
        self.db.delete_user_memory(id).map_err(|e| e.to_string())
    }

    async fn clear_memories(&self) -> Result<(), String> {
        self.db.clear_user_memories().map_err(|e| e.to_string())
    }
}
