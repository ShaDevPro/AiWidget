use async_trait::async_trait;
use tokio::sync::mpsc;
use crate::core::traits::{CompletionOptions, LLMProvider};
use crate::models::{ChatMessage, LLMModel};

pub struct LocalOllamaProvider {
    pub base_url: String,
}

impl LocalOllamaProvider {
    pub fn new(base_url: String) -> Self {
        Self { base_url }
    }
}

#[async_trait]
impl LLMProvider for LocalOllamaProvider {
    async fn list_models(&self) -> Result<Vec<LLMModel>, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/api/tags", self.base_url);
        let resp = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Failed to reach Ollama: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("Ollama returned status {}", resp.status()));
        }

        #[derive(serde::Deserialize)]
        struct OllamaTags {
            models: Vec<OllamaModelTag>,
        }
        #[derive(serde::Deserialize)]
        struct OllamaModelTag {
            name: String,
            size: Option<u64>,
            modified_at: Option<String>,
        }

        let tags: OllamaTags = resp
            .json()
            .await
            .map_err(|e| format!("Invalid JSON from Ollama: {}", e))?;

        let models = tags
            .models
            .into_iter()
            .map(|m| {
                let size_str = m.size.map(|s| {
                    let gb = s as f64 / (1024.0 * 1024.0 * 1024.0);
                    format!("{:.1} GB", gb)
                });
                LLMModel {
                    name: m.name,
                    size: size_str,
                    modified_at: m.modified_at,
                }
            })
            .collect();

        Ok(models)
    }

    async fn generate_stream(
        &self,
        model: &str,
        messages: &[ChatMessage],
        options: &CompletionOptions,
        token_sender: mpsc::UnboundedSender<String>,
    ) -> Result<String, String> {
        crate::llm::chat_stream_channel(
            model,
            messages,
            options.temperature,
            options.max_tokens,
            &self.base_url,
            token_sender,
        )
        .await
    }
}
