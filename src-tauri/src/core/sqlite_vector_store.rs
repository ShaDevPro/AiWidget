use async_trait::async_trait;
use std::sync::Arc;
use crate::core::traits::VectorStore;
use crate::db::Database;
use crate::models::{RAGChunk, RAGDocument, RAGSearchResult};

pub struct SqliteVectorStore {
    pub db: Arc<Database>,
}

impl SqliteVectorStore {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }
}

#[async_trait]
impl VectorStore for SqliteVectorStore {
    async fn list_documents(&self) -> Result<Vec<RAGDocument>, String> {
        self.db.get_rag_documents().map_err(|e| e.to_string())
    }

    async fn insert_document(&self, doc: RAGDocument, chunks: Vec<RAGChunk>) -> Result<(), String> {
        self.db.save_rag_document_with_chunks(&doc, &chunks).map_err(|e| e.to_string())
    }

    async fn delete_document(&self, id: &str) -> Result<(), String> {
        self.db.delete_rag_document(id).map_err(|e| e.to_string())
    }

    async fn clear_documents(&self) -> Result<(), String> {
        self.db.clear_rag_documents().map_err(|e| e.to_string())
    }

    async fn search_similar(&self, query: &str, top_k: usize) -> Result<Vec<RAGSearchResult>, String> {
        self.db.search_rag_fts(query, top_k).map_err(|e| e.to_string())
    }
}
