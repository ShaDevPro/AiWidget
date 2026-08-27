use serde::{Deserialize, Serialize};

use crate::models::ChatMessage;

const CLASSIFIER_PROMPT: &str = r#"You are a routing classifier for an AI assistant (like ChatGPT browsing mode).
Decide if answering the user message requires LIVE, up-to-date information from the internet that cannot be reliably answered from static training knowledge alone.

Needs web (needs_web=true): current weather forecasts, today's news, live sports scores, stock/crypto prices, exchange rates, recent events, "who won yesterday", current officials, product prices/availability now, anything explicitly asking to search the web.

Does NOT need web (needs_web=false): general knowledge, math, coding, creative writing, history, philosophy, recipes, explanations, local document questions, hypotheticals.

Reply ONLY with valid JSON, no markdown, no extra text:
{"needs_web":true|false,"confidence":0.0-1.0,"category":"weather|news|finance|sports|live_facts|general|creative"}"#;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebIntentResult {
    #[serde(rename = "needs_web", alias = "needsWeb", default)]
    pub needs_web: bool,
    #[serde(default)]
    pub confidence: f32,
    #[serde(default = "default_category")]
    pub category: String,
}

fn default_category() -> String {
    "general".to_string()
}

impl Default for WebIntentResult {
    fn default() -> Self {
        Self {
            needs_web: false,
            confidence: 0.0,
            category: "general".to_string(),
        }
    }
}

pub struct WebIntentClassifier;

impl WebIntentClassifier {
    pub async fn classify(base_url: &str, model: &str, query: &str) -> WebIntentResult {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return WebIntentResult::default();
        }

        let messages = vec![
            ChatMessage {
                role: "system".to_string(),
                content: CLASSIFIER_PROMPT.to_string(),
                images: None,
            },
            ChatMessage {
                role: "user".to_string(),
                content: trimmed.to_string(),
                images: None,
            },
        ];

        match crate::llm::chat_complete(base_url, model, messages, 0.05, 120).await {
            Ok(raw) => Self::parse_response(&raw),
            Err(e) => {
                eprintln!("[WebIntent] LLM classification failed: {}", e);
                WebIntentResult::default()
            }
        }
    }

    fn parse_response(raw: &str) -> WebIntentResult {
        let json_str = Self::extract_json(raw);
        if let Ok(mut parsed) = serde_json::from_str::<WebIntentResult>(&json_str) {
            parsed.confidence = parsed.confidence.clamp(0.0, 1.0);
            parsed.category = Self::normalize_category(&parsed.category);
            return parsed;
        }
        WebIntentResult::default()
    }

    fn extract_json(raw: &str) -> String {
        let trimmed = raw.trim();
        if trimmed.starts_with('{') {
            return trimmed.to_string();
        }
        if let Some(start) = trimmed.find('{') {
            if let Some(end) = trimmed.rfind('}') {
                return trimmed[start..=end].to_string();
            }
        }
        trimmed.to_string()
    }

    fn normalize_category(cat: &str) -> String {
        match cat.to_lowercase().as_str() {
            "weather" | "news" | "finance" | "sports" | "live_facts" | "general" | "creative" => {
                cat.to_lowercase()
            }
            _ => "live_facts".to_string(),
        }
    }
}
