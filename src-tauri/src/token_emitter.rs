use serde_json::json;
use std::time::{Duration, Instant};
use tauri::{Manager, Window};

const MAX_BATCH_CHUNKS: usize = 4;
const MAX_BATCH_MS: u64 = 16;

/// Batches streaming token chunks before emitting `chat-token` IPC events.
pub struct ChatTokenBatcher {
    window: Window,
    buffer: String,
    chunks: usize,
    last_flush: Instant,
}

impl ChatTokenBatcher {
    pub fn new(window: Window) -> Self {
        Self {
            window,
            buffer: String::new(),
            chunks: 0,
            last_flush: Instant::now(),
        }
    }

    pub fn push(&mut self, content: &str, stream_done: bool) {
        if !content.is_empty() {
            self.buffer.push_str(content);
            self.chunks += 1;
        }

        let elapsed = self.last_flush.elapsed() >= Duration::from_millis(MAX_BATCH_MS);
        let batch_full = self.chunks >= MAX_BATCH_CHUNKS;
        let should_emit = stream_done || ((batch_full || elapsed) && !self.buffer.is_empty());

        if should_emit {
            self.flush(stream_done);
        } else if stream_done && self.buffer.is_empty() {
            let _ = self.window.emit_all("chat-token", json!({ "content": "", "done": true }));
        }
    }

    pub fn flush_cancelled(&mut self) {
        if !self.buffer.is_empty() {
            let _ = self.window.emit_all(
                "chat-token",
                json!({ "content": &self.buffer, "done": false }),
            );
            self.buffer.clear();
            self.chunks = 0;
        }
        let _ = self.window.emit_all(
            "chat-token",
            json!({ "content": "", "done": true, "cancelled": true }),
        );
    }
}

impl ChatTokenBatcher {
    fn flush(&mut self, done: bool) {
        if !self.buffer.is_empty() {
            let _ = self.window.emit_all(
                "chat-token",
                json!({ "content": &self.buffer, "done": done }),
            );
            self.buffer.clear();
            self.chunks = 0;
            self.last_flush = Instant::now();
        } else if done {
            let _ = self.window.emit_all("chat-token", json!({ "content": "", "done": true }));
        }
    }
}
