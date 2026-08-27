use anyhow::Result;
use crate::db::Database;
use crate::models::{RAGSemanticSearchResult, VectorDBStats};

pub const VECTOR_DIMENSIONS: usize = 384;

#[derive(Debug, Clone)]
pub struct ChunkWithEmbedding {
    pub document_id: String,
    pub document_name: String,
    pub chunk_index: usize,
    pub content: String,
    pub metadata: String,
    pub embedding: Vec<f32>,
}

pub struct VectorDB;

impl VectorDB {
    /// Computes a normalized dense vector embedding (384-D) for a given text
    /// Uses subword n-gram hashing, positional decay and L2-normalization for cosine similarity.
    pub fn embed_text(text: &str) -> Vec<f32> {
        let mut vector = vec![0.0f32; VECTOR_DIMENSIONS];
        let clean = text.to_lowercase();
        let words: Vec<&str> = clean
            .split(|c: char| !c.is_alphanumeric() && c != '_')
            .filter(|w| !w.is_empty())
            .collect();

        if words.is_empty() {
            return vector;
        }

        // 1. Word token hashing & projection
        for (pos, word) in words.iter().enumerate() {
            let weight = 1.0 / (1.0 + 0.05 * (pos as f32).sqrt());
            let hash = Self::hash_str(word);
            let idx = (hash as usize) % VECTOR_DIMENSIONS;
            let sign = if (hash >> 16) % 2 == 0 { 1.0 } else { -1.0 };
            vector[idx] += weight * sign;

            // Character n-grams (3-grams, 4-grams) for subword semantic capture
            let chars: Vec<char> = word.chars().collect();
            if chars.len() >= 3 {
                for window_size in 3..=4.min(chars.len()) {
                    for window in chars.windows(window_size) {
                        let ngram: String = window.iter().collect();
                        let ng_hash = Self::hash_str(&ngram);
                        let ng_idx = (ng_hash as usize) % VECTOR_DIMENSIONS;
                        let ng_sign = if (ng_hash >> 16) % 2 == 0 { 1.0 } else { -1.0 };
                        vector[ng_idx] += 0.4 * weight * ng_sign;
                    }
                }
            }
        }

        // 2. L2-Normalize vector so dot product equals cosine similarity
        let norm_sq: f32 = vector.iter().map(|&x| x * x).sum();
        if norm_sq > 1e-8 {
            let norm = norm_sq.sqrt();
            for val in vector.iter_mut() {
                *val /= norm;
            }
        }

        vector
    }

    /// Computes exact cosine similarity between two normalized vectors
    #[inline]
    pub fn cosine_similarity(v1: &[f32], v2: &[f32]) -> f32 {
        if v1.len() != v2.len() || v1.is_empty() {
            return 0.0;
        }
        let dot: f32 = v1.iter().zip(v2.iter()).map(|(&a, &b)| a * b).sum();
        dot.clamp(0.0, 1.0)
    }

    /// Converts a float vector to a byte buffer for SQLite BLOB storage
    pub fn vector_to_bytes(v: &[f32]) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(v.len() * 4);
        for &val in v {
            bytes.extend_from_slice(&val.to_le_bytes());
        }
        bytes
    }

    /// Converts a byte buffer from SQLite back into a float vector
    pub fn bytes_to_vector(bytes: &[u8]) -> Vec<f32> {
        if bytes.len() % 4 != 0 {
            return Vec::new();
        }
        let mut v = Vec::with_capacity(bytes.len() / 4);
        for chunk in bytes.chunks_exact(4) {
            let arr: [u8; 4] = [chunk[0], chunk[1], chunk[2], chunk[3]];
            v.push(f32::from_le_bytes(arr));
        }
        v
    }

    /// High-performance semantic vector search across all indexed chunks in the local database
    pub fn search_semantic(
        db: &Database,
        query: &str,
        top_k: usize,
        min_similarity: f32,
    ) -> Result<Vec<RAGSemanticSearchResult>> {
        let query_vec = Self::embed_text(query);
        let all_chunks = db.get_all_rag_chunks_with_embeddings()?;

        let mut scored_results: Vec<RAGSemanticSearchResult> = Vec::new();

        for chunk in all_chunks {
            let sim = Self::cosine_similarity(&query_vec, &chunk.embedding);
            if sim >= min_similarity {
                let similarity_pct = ((sim * 100.0).round() as u32).min(100);
                scored_results.push(RAGSemanticSearchResult {
                    document_id: chunk.document_id,
                    document_name: chunk.document_name,
                    chunk_index: chunk.chunk_index,
                    content: chunk.content,
                    similarity: sim,
                    similarity_pct,
                    metadata: chunk.metadata,
                });
            }
        }

        // Sort descending by similarity score
        scored_results.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap_or(std::cmp::Ordering::Equal));
        scored_results.truncate(top_k);

        Ok(scored_results)
    }

    /// Computes Vector Database statistics
    pub fn get_stats(db: &Database) -> Result<VectorDBStats> {
        let (total_docs, total_chunks) = db.get_rag_counts()?;
        let memory_bytes = total_chunks * VECTOR_DIMENSIONS * 4;

        Ok(VectorDBStats {
            total_documents: total_docs,
            total_chunks,
            dimensions: VECTOR_DIMENSIONS,
            is_ready: true,
            memory_bytes,
        })
    }

    /// 64-bit FNV-1a Hash for high entropy distribution across 384 dimensions
    fn hash_str(s: &str) -> u64 {
        let mut hasher: u64 = 0xcbf29ce484222325;
        for byte in s.as_bytes() {
            hasher ^= *byte as u64;
            hasher = hasher.wrapping_mul(0x100000001b3);
        }
        hasher
    }
}
