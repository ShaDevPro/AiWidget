use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

/// Shared cancel flag for in-flight LLM generation (Ollama + llama-server).
#[derive(Clone, Default)]
pub struct GenerationController {
    cancel_requested: Arc<AtomicBool>,
}

impl GenerationController {
    pub fn reset(&self) {
        self.cancel_requested.store(false, Ordering::SeqCst);
    }

    pub fn request_cancel(&self) {
        self.cancel_requested.store(true, Ordering::SeqCst);
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancel_requested.load(Ordering::SeqCst)
    }
}

pub const ERR_GENERATION_CANCELLED: &str = "ERR_GENERATION_CANCELLED";
