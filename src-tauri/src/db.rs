use anyhow::{Context, Result};
use chrono::Utc;
use rusqlite::{params, Connection};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use crate::models::*;

pub struct Database {
    conn: Mutex<Connection>,
    #[allow(dead_code)]
    path: PathBuf,
}

impl Database {
    pub fn new(path: &Path) -> Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).ok();
        }
        let conn = Connection::open(path)
            .with_context(|| format!("Failed to open database at {}", path.display()))?;
        Ok(Self {
            conn: Mutex::new(conn),
            path: path.to_path_buf(),
        })
    }

    pub fn init(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                model TEXT NOT NULL,
                is_pinned BOOLEAN NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_memories (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                key TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS rag_documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                filepath TEXT NOT NULL,
                file_type TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                chunk_count INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS rag_chunks (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES rag_documents(id) ON DELETE CASCADE
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS rag_fts USING fts5(
                content,
                document_id UNINDEXED,
                document_name UNINDEXED,
                chunk_index UNINDEXED,
                metadata UNINDEXED,
                tokenize = 'unicode61 remove_diacritics 2'
            );

            CREATE INDEX IF NOT EXISTS idx_messages_conversation 
                ON messages(conversation_id);

            CREATE INDEX IF NOT EXISTS idx_conversations_updated 
                ON conversations(updated_at DESC);

            CREATE INDEX IF NOT EXISTS idx_rag_chunks_doc 
                ON rag_chunks(document_id);

            CREATE TABLE IF NOT EXISTS user_quotas (
                id TEXT PRIMARY KEY,
                daily_limit INTEGER NOT NULL DEFAULT 100,
                used_today INTEGER NOT NULL DEFAULT 0,
                last_reset_date TEXT NOT NULL
            );
            "#,
        )?;

        // Ensure migration for is_pinned column
        let _ = conn.execute("ALTER TABLE conversations ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT 0", []);
        // Ensure migration for vector embedding column
        let _ = conn.execute("ALTER TABLE rag_chunks ADD COLUMN embedding BLOB", []);
        // Web sources JSON for assistant messages
        let _ = conn.execute("ALTER TABLE messages ADD COLUMN web_sources TEXT", []);
        // LLM payload when UI content differs (document attachments)
        let _ = conn.execute("ALTER TABLE messages ADD COLUMN llm_content TEXT", []);

        Ok(())
    }

    pub fn get_conversations(&self) -> Result<Vec<Conversation>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, model, is_pinned, created_at, updated_at 
             FROM conversations ORDER BY is_pinned DESC, updated_at DESC"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                title: row.get(1)?,
                model: row.get(2)?,
                is_pinned: row.get(3)?,
                created_at: row.get::<_, String>(4)?.parse().unwrap_or_else(|_| Utc::now()),
                updated_at: row.get::<_, String>(5)?.parse().unwrap_or_else(|_| Utc::now()),
            })
        })?;
        let mut convs = Vec::new();
        for row in rows {
            convs.push(row?);
        }
        Ok(convs)
    }

    pub fn save_conversation(&self, conv: &Conversation) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO conversations (id, title, model, is_pinned, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                conv.id,
                conv.title,
                conv.model,
                conv.is_pinned,
                conv.created_at.to_rfc3339(),
                conv.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn toggle_conversation_pin(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let current: bool = conn
            .query_row(
                "SELECT is_pinned FROM conversations WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )
            .unwrap_or(false);
        let new_state = !current;
        conn.execute(
            "UPDATE conversations SET is_pinned = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_state, Utc::now().to_rfc3339(), id],
        )?;
        Ok(new_state)
    }

    pub fn update_conversation_title(&self, id: &str, title: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE conversations SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![title, Utc::now().to_rfc3339(), id],
        )?;
        Ok(())
    }

    pub fn delete_conversation(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM messages WHERE conversation_id = ?1", params![id])?;
        conn.execute("DELETE FROM conversations WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Delete ALL conversations and messages (used by self-service delete & admin clear).
    pub fn clear_conversations(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch("DELETE FROM messages; DELETE FROM conversations;")?;
        Ok(())
    }

    pub fn get_messages(&self, conversation_id: &str) -> Result<Vec<Message>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, conversation_id, role, content, created_at, web_sources, llm_content 
             FROM messages WHERE conversation_id = ?1 
             ORDER BY created_at ASC"
        )?;
        let rows = stmt.query_map(params![conversation_id], |row| {
            let web_sources_raw: Option<String> = row.get(5)?;
            let web_sources = web_sources_raw
                .as_deref()
                .and_then(|s| serde_json::from_str(s).ok());
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                created_at: row.get::<_, String>(4)?.parse().unwrap_or_else(|_| Utc::now()),
                web_sources,
                llm_content: row.get(6)?,
            })
        })?;
        let mut msgs = Vec::new();
        for row in rows {
            msgs.push(row?);
        }
        Ok(msgs)
    }

    pub fn delete_message(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM messages WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn delete_messages_from(&self, conversation_id: &str, from_created_at: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM messages WHERE conversation_id = ?1 AND created_at >= ?2",
            params![conversation_id, from_created_at],
        )?;
        Ok(())
    }

    pub fn search_messages(&self, query: &str) -> Result<Vec<(String, String, String, String)>> {
        let conn = self.conn.lock().unwrap();
        let pattern = format!("%{}%", query);
        let mut stmt = conn.prepare(
            "SELECT m.id, m.conversation_id, c.title, m.content 
             FROM messages m
             JOIN conversations c ON m.conversation_id = c.id
             WHERE m.content LIKE ?1
             ORDER BY m.created_at DESC LIMIT 30"
        )?;
        let rows = stmt.query_map(params![pattern], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })?;
        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }
        Ok(results)
    }

    pub fn save_message(&self, msg: &Message) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let web_sources_json = msg
            .web_sources
            .as_ref()
            .map(|s| serde_json::to_string(s))
            .transpose()?;
        conn.execute(
            "INSERT OR REPLACE INTO messages (id, conversation_id, role, content, created_at, web_sources, llm_content) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                msg.id,
                msg.conversation_id,
                msg.role,
                msg.content,
                msg.created_at.to_rfc3339(),
                web_sources_json,
                msg.llm_content,
            ],
        )?;
        conn.execute(
            "UPDATE conversations SET updated_at = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), msg.conversation_id],
        )?;
        Ok(())
    }

    pub fn save_settings(&self, settings: &AppSettings) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let serialized = serde_json::to_string(settings)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params!["app_settings", serialized],
        )?;
        Ok(())
    }

    pub fn get_settings(&self) -> Result<AppSettings> {
        let conn = self.conn.lock().unwrap();
        let result: Result<String, _> = conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params!["app_settings"],
            |row| row.get(0),
        );
        match result {
            Ok(val) => Ok(serde_json::from_str(&val).unwrap_or_default()),
            Err(_) => Ok(AppSettings::default()),
        }
    }

    // ==========================================
    // USER MEMORY METHODS
    // ==========================================
    pub fn get_user_memories(&self) -> Result<Vec<UserMemory>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, category, key, content, created_at, updated_at 
             FROM user_memories ORDER BY updated_at DESC"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(UserMemory {
                id: row.get(0)?,
                category: row.get(1)?,
                key: row.get(2)?,
                content: row.get(3)?,
                created_at: row.get::<_, String>(4)?.parse().unwrap_or_else(|_| Utc::now()),
                updated_at: row.get::<_, String>(5)?.parse().unwrap_or_else(|_| Utc::now()),
            })
        })?;
        let mut memories = Vec::new();
        for row in rows {
            memories.push(row?);
        }
        Ok(memories)
    }

    pub fn save_user_memory(&self, memory: &UserMemory) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO user_memories (id, category, key, content, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                memory.id,
                memory.category,
                memory.key,
                memory.content,
                memory.created_at.to_rfc3339(),
                memory.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn delete_user_memory(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM user_memories WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn clear_user_memories(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM user_memories", [])?;
        Ok(())
    }

    // ==========================================
    // RAG DOCUMENT & CHUNKS METHODS
    // ==========================================
    pub fn get_rag_documents(&self) -> Result<Vec<RAGDocument>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, filename, filepath, file_type, size_bytes, chunk_count, created_at 
             FROM rag_documents ORDER BY created_at DESC"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(RAGDocument {
                id: row.get(0)?,
                filename: row.get(1)?,
                filepath: row.get(2)?,
                file_type: row.get(3)?,
                size_bytes: row.get(4)?,
                chunk_count: row.get::<_, i64>(5)? as usize,
                created_at: row.get::<_, String>(6)?.parse().unwrap_or_else(|_| Utc::now()),
            })
        })?;
        let mut docs = Vec::new();
        for row in rows {
            docs.push(row?);
        }
        Ok(docs)
    }

    pub fn save_rag_document_with_chunks(&self, doc: &RAGDocument, chunks: &[RAGChunk]) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        // Delete any existing doc with same id
        tx.execute("DELETE FROM rag_fts WHERE document_id = ?1", params![doc.id])?;
        tx.execute("DELETE FROM rag_chunks WHERE document_id = ?1", params![doc.id])?;
        tx.execute("DELETE FROM rag_documents WHERE id = ?1", params![doc.id])?;

        // Insert document
        tx.execute(
            "INSERT INTO rag_documents (id, filename, filepath, file_type, size_bytes, chunk_count, created_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                doc.id,
                doc.filename,
                doc.filepath,
                doc.file_type,
                doc.size_bytes,
                doc.chunk_count as i64,
                doc.created_at.to_rfc3339(),
            ],
        )?;

        // Insert chunks with vector embeddings and index in FTS5
        for chunk in chunks {
            let vec = crate::vector_db::VectorDB::embed_text(&chunk.content);
            let vec_bytes = crate::vector_db::VectorDB::vector_to_bytes(&vec);

            tx.execute(
                "INSERT INTO rag_chunks (id, document_id, chunk_index, content, metadata, embedding) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    chunk.id,
                    chunk.document_id,
                    chunk.chunk_index as i64,
                    chunk.content,
                    chunk.metadata,
                    vec_bytes,
                ],
            )?;

            tx.execute(
                "INSERT INTO rag_fts (content, document_id, document_name, chunk_index, metadata) 
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    chunk.content,
                    chunk.document_id,
                    doc.filename,
                    chunk.chunk_index as i64,
                    chunk.metadata,
                ],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    pub fn delete_rag_document(&self, doc_id: &str) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        tx.execute("DELETE FROM rag_fts WHERE document_id = ?1", params![doc_id])?;
        tx.execute("DELETE FROM rag_chunks WHERE document_id = ?1", params![doc_id])?;
        tx.execute("DELETE FROM rag_documents WHERE id = ?1", params![doc_id])?;
        tx.commit()?;
        Ok(())
    }

    pub fn clear_rag_documents(&self) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        tx.execute("DELETE FROM rag_fts", [])?;
        tx.execute("DELETE FROM rag_chunks", [])?;
        tx.execute("DELETE FROM rag_documents", [])?;
        tx.commit()?;
        Ok(())
    }

    pub fn search_rag_fts(&self, query: &str, top_k: usize) -> Result<Vec<RAGSearchResult>> {
        let conn = self.conn.lock().unwrap();
        
        // Clean query for FTS5 syntax
        let sanitized = query
            .chars()
            .map(|c| if c.is_alphanumeric() || c.is_whitespace() { c } else { ' ' })
            .collect::<String>();
        
        let words: Vec<&str> = sanitized.split_whitespace().filter(|w| w.len() > 1).take(16).collect();
        if words.is_empty() {
            return Ok(Vec::new());
        }

        // Build MATCH expression with OR / prefix for maximum recall
        let fts_query = words
            .iter()
            .map(|w| format!("\"{}\"*", w))
            .collect::<Vec<_>>()
            .join(" OR ");

        let mut stmt = conn.prepare(
            "SELECT document_id, document_name, chunk_index, content, metadata, bm25(rag_fts) as rank
             FROM rag_fts
             WHERE rag_fts MATCH ?1
             ORDER BY rank ASC
             LIMIT ?2"
        )?;

        let rows = stmt.query_map(params![fts_query, top_k as i64], |row| {
            let rank: f64 = row.get(5)?;
            Ok(RAGSearchResult {
                document_id: row.get(0)?,
                document_name: row.get(1)?,
                chunk_index: row.get::<_, i64>(2)? as usize,
                content: row.get(3)?,
                metadata: row.get(4)?,
                score: -rank, // BM25 lower is better, so negate for standard score
            })
        })?;

        let mut results = Vec::new();
        for row in rows {
            if let Ok(res) = row {
                results.push(res);
            }
        }
        Ok(results)
    }

    pub fn get_rag_counts(&self) -> Result<(usize, usize)> {
        let conn = self.conn.lock().unwrap();
        let total_docs: usize = conn.query_row("SELECT COUNT(*) FROM rag_documents", [], |row| row.get(0))?;
        let total_chunks: usize = conn.query_row("SELECT COUNT(*) FROM rag_chunks", [], |row| row.get(0))?;
        Ok((total_docs, total_chunks))
    }

    pub fn get_all_rag_chunks_with_embeddings(&self) -> Result<Vec<crate::vector_db::ChunkWithEmbedding>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT c.document_id, d.filename, c.chunk_index, c.content, c.metadata, c.embedding
             FROM rag_chunks c
             JOIN rag_documents d ON c.document_id = d.id"
        )?;

        let rows = stmt.query_map([], |row| {
            let document_id: String = row.get(0)?;
            let document_name: String = row.get(1)?;
            let chunk_index: usize = row.get::<_, i64>(2)? as usize;
            let content: String = row.get(3)?;
            let metadata: String = row.get(4)?;
            let embedding_bytes: Option<Vec<u8>> = row.get(5)?;

            let embedding = match embedding_bytes {
                Some(b) if !b.is_empty() => crate::vector_db::VectorDB::bytes_to_vector(&b),
                _ => crate::vector_db::VectorDB::embed_text(&content),
            };

            Ok(crate::vector_db::ChunkWithEmbedding {
                document_id,
                document_name,
                chunk_index,
                content,
                metadata,
                embedding,
            })
        })?;

        let mut results = Vec::new();
        for row in rows {
            if let Ok(c) = row {
                results.push(c);
            }
        }
        Ok(results)
    }

    pub fn reindex_all_chunk_vectors(&self) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, content FROM rag_chunks")?;
        let rows = stmt.query_map([], |row| {
            let id: String = row.get(0)?;
            let content: String = row.get(1)?;
            Ok((id, content))
        })?;

        let mut count = 0;
        for row in rows {
            if let Ok((id, content)) = row {
                let vec = crate::vector_db::VectorDB::embed_text(&content);
                let bytes = crate::vector_db::VectorDB::vector_to_bytes(&vec);
                let _ = conn.execute(
                    "UPDATE rag_chunks SET embedding = ?1 WHERE id = ?2",
                    params![bytes, id],
                );
                count += 1;
            }
        }
        Ok(count)
    }

    pub fn get_or_create_quota(&self, profile_id: &str, is_admin: bool, default_limit: u32) -> Result<UserQuota> {
        let conn = self.conn.lock().unwrap();
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();

        let row: Option<(u32, u32, String)> = conn
            .query_row(
                "SELECT daily_limit, used_today, last_reset_date FROM user_quotas WHERE id = 'current'",
                [],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .ok();

        let (daily_limit, used_today, reset_date) = match row {
            Some((limit, used, date)) => {
                if date != today {
                    let _ = conn.execute(
                        "UPDATE user_quotas SET used_today = 0, last_reset_date = ?1 WHERE id = 'current'",
                        params![today],
                    );
                    (limit, 0, today)
                } else {
                    (limit, used, date)
                }
            }
            None => {
                let limit = if is_admin { 0 } else { default_limit };
                let _ = conn.execute(
                    "INSERT INTO user_quotas (id, daily_limit, used_today, last_reset_date) VALUES ('current', ?1, 0, ?2)",
                    params![limit, today],
                );
                (limit, 0, today)
            }
        };

        let remaining_today = if is_admin {
            999999
        } else if used_today >= daily_limit {
            0
        } else {
            daily_limit - used_today
        };

        let is_exceeded = !is_admin && used_today >= daily_limit;

        Ok(UserQuota {
            profile_id: profile_id.to_string(),
            is_admin,
            daily_limit,
            used_today,
            remaining_today,
            reset_date,
            is_exceeded,
        })
    }

    pub fn increment_quota(&self, profile_id: &str, is_admin: bool, default_limit: u32) -> Result<UserQuota> {
        let mut quota = self.get_or_create_quota(profile_id, is_admin, default_limit)?;
        if is_admin {
            return Ok(quota);
        }

        let conn = self.conn.lock().unwrap();
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        conn.execute(
            "UPDATE user_quotas SET used_today = used_today + 1, last_reset_date = ?1 WHERE id = 'current'",
            params![today],
        )?;

        quota.used_today += 1;
        quota.remaining_today = if quota.used_today >= quota.daily_limit {
            0
        } else {
            quota.daily_limit - quota.used_today
        };
        quota.is_exceeded = quota.used_today >= quota.daily_limit;

        Ok(quota)
    }

    pub fn set_quota_limit(&self, limit: u32) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        conn.execute(
            "INSERT INTO user_quotas (id, daily_limit, used_today, last_reset_date)
             VALUES ('current', ?1, 0, ?2)
             ON CONFLICT(id) DO UPDATE SET daily_limit = excluded.daily_limit",
            params![limit, today],
        )?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn path(&self) -> &Path {
        &self.path
    }
}
