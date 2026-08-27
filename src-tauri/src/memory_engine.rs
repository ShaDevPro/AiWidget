use crate::db::Database;
use crate::models::{ChatMessage, UserMemory};

pub struct MemoryEngine;

impl MemoryEngine {
    /// Formats persistent user memories into an LLM prompt block
    pub fn get_formatted_memories(db: &Database) -> String {
        let memories = match db.get_user_memories() {
            Ok(m) => m,
            Err(_) => return String::new(),
        };

        if memories.is_empty() {
            return String::new();
        }

        let mut block = String::from("\n\n<user_profile>\n");

        for mem in memories {
            block.push_str(&format!("  <attribute key=\"{}\" category=\"{}\">{}</attribute>\n", mem.key, mem.category, mem.content));
        }

        block.push_str(
            "</user_profile>\n\
            <memory_instructions>\n\
            Incorporate relevant details from <user_profile> to tailor answers naturally without quoting XML tags.\n\
            </memory_instructions>\n\n"
        );
        block
    }

    /// Automatically extracts and saves key personal facts from user messages
    pub fn extract_and_save_facts(db: &Database, text: &str) {
        let lower = text.to_lowercase();
        let trimmed = text.trim();

        // 1. Name detection (FR & EN)
        if lower.starts_with("je m'appelle ") || lower.starts_with("mon nom est ") {
            let name = trimmed
                .split_at(if lower.starts_with("je m'appelle ") { 13 } else { 12 })
                .1
                .trim_matches(|c: char| c.is_ascii_punctuation() || c.is_whitespace());
            if !name.is_empty() && name.len() < 40 {
                let mem = UserMemory::new("identity".to_string(), "Nom de l'utilisateur".to_string(), name.to_string());
                db.save_user_memory(&mem).ok();
            }
        } else if lower.starts_with("my name is ") {
            let name = trimmed[11..]
                .trim_matches(|c: char| c.is_ascii_punctuation() || c.is_whitespace());
            if !name.is_empty() && name.len() < 40 {
                let mem = UserMemory::new("identity".to_string(), "User Name".to_string(), name.to_string());
                db.save_user_memory(&mem).ok();
            }
        }

        // 2. Project detection
        if lower.starts_with("je travaille sur ") || lower.starts_with("mon projet est ") {
            let project = trimmed
                .split_at(if lower.starts_with("je travaille sur ") { 17 } else { 15 })
                .1
                .trim_matches(|c: char| c.is_ascii_punctuation() || c.is_whitespace());
            if !project.is_empty() && project.len() < 120 {
                let mem = UserMemory::new("project".to_string(), "Projet en cours".to_string(), project.to_string());
                db.save_user_memory(&mem).ok();
            }
        } else if lower.starts_with("i am working on ") || lower.starts_with("my project is ") {
            let project = trimmed
                .split_at(if lower.starts_with("i am working on ") { 16 } else { 14 })
                .1
                .trim_matches(|c: char| c.is_ascii_punctuation() || c.is_whitespace());
            if !project.is_empty() && project.len() < 120 {
                let mem = UserMemory::new("project".to_string(), "Current Project".to_string(), project.to_string());
                db.save_user_memory(&mem).ok();
            }
        }

        // 3. Preference detection (e.g. "je préfère X", "i prefer X")
        if lower.starts_with("je préfère ") || lower.starts_with("j'utilise ") {
            let pref = trimmed
                .split_at(if lower.starts_with("je préfère ") { 11 } else { 10 })
                .1
                .trim_matches(|c: char| c.is_ascii_punctuation() || c.is_whitespace());
            if !pref.is_empty() && pref.len() < 120 {
                let mem = UserMemory::new("preference".to_string(), "Préférence".to_string(), pref.to_string());
                db.save_user_memory(&mem).ok();
            }
        }
    }

    /// Builds a token-budgeted sliding context window.
    /// `num_ctx` = model context size; `max_output_tokens` = generation budget to reserve.
    pub fn build_sliding_context(
        history: &[ChatMessage],
        num_ctx: usize,
        max_output_tokens: u32,
    ) -> Vec<ChatMessage> {
        if history.is_empty() {
            return Vec::new();
        }

        let effective_ctx = num_ctx.max(4096);
        let reserved_output = (max_output_tokens as usize).min(1024);
        let input_token_budget = effective_ctx.saturating_sub(reserved_output + 256);
        let char_limit = input_token_budget.saturating_mul(3).max(6000);

        let system_msg = history.first().filter(|m| m.role == "system").cloned();
        let system_chars = system_msg.as_ref().map(|m| m.content.len()).unwrap_or(0);
        let mut remaining = char_limit.saturating_sub(system_chars).max(3000);

        let start_idx = if system_msg.is_some() { 1 } else { 0 };
        let mut included = Vec::new();

        for (i, msg) in history[start_idx..].iter().rev().enumerate() {
            let is_latest_turn = i == 0;
            if remaining == 0 && !included.is_empty() {
                break;
            }

            let max_doc = remaining.min(MAX_ATTACHMENT_CHARS);
            let compact_content = compact_user_message_content(&msg.content, max_doc);

            if compact_content.len() > remaining {
                if is_latest_turn {
                    remaining = 0;
                    included.push(ChatMessage {
                        role: msg.role.clone(),
                        content: compact_content,
                        images: msg.images.clone(),
                    });
                    continue;
                } else if !included.is_empty() {
                    break;
                }
            }

            remaining = remaining.saturating_sub(compact_content.len());
            included.push(ChatMessage {
                role: msg.role.clone(),
                content: compact_content,
                images: msg.images.clone(),
            });
        }

        included.reverse();

        let mut final_context = Vec::with_capacity(included.len() + 1);
        if let Some(sys) = system_msg {
            final_context.push(sys);
        }
        final_context.extend(included);

        final_context
    }
}

const MAX_ATTACHMENT_CHARS: usize = 8_000;

/// Truncate embedded document text inside user messages (legacy rows + LLM context).
fn compact_user_message_content(content: &str, max_doc_chars: usize) -> String {
    let max_doc = max_doc_chars.max(1024).min(MAX_ATTACHMENT_CHARS);
    if !content.contains("[DOCUMENT ATTACHÉ:") {
        if content.len() > max_doc * 2 {
            return format!("{}…", &content[..max_doc]);
        }
        return content.to_string();
    }

    let sep = "==================================================";
    let parts: Vec<&str> = content.splitn(3, sep).collect();
    if parts.len() < 3 {
        return content.to_string();
    }

    let header = parts[0];
    let doc = parts[1].trim();
    let footer = parts[2]; // Contains user prompt/question

    let doc_compact = if doc.len() > max_doc {
        format!("{}\n[...]", &doc[..max_doc])
    } else {
        doc.to_string()
    };

    format!("{}\n{}\n{}\n{}\n{}", header.trim_end(), sep, doc_compact, sep, footer.trim_start())
}
