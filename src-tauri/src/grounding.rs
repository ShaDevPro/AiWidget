use chrono::Local;

/// Shared grounding helpers — temporal anchor + anti-hallucination rules (all domains).
pub struct Grounding;

impl Grounding {
    /// Injected into system prompt so the model knows today's date.
    pub fn temporal_system_block(lang: &str) -> String {
        let now = Local::now();
        let iso = now.format("%Y-%m-%d").to_string();
        let human = match lang {
            "en" => now.format("%A, %B %d, %Y — %H:%M").to_string(),
            "ar" => now.format("%Y-%m-%d %H:%M").to_string(),
            _ => now.format("%A %d %B %Y, %H:%M").to_string(),
        };

        format!("\n\n<current_datetime iso=\"{iso}\">{human}</current_datetime>")
    }

    pub fn web_mode_hint() -> &'static str {
        "\n\n<web_mode>Des données web temps réel sont fournies ci-dessous. Réponds précisément à la demande de l'utilisateur (analyse, critique, synthèse ou faits) en te basant sur ces sources vérifiées.</web_mode>"
    }

    pub fn offline_mode_hint() -> &'static str {
        "\n\n<offline_mode>Mode 100% local actif. Utilise tes connaissances pour le raisonnement, le code et les explications.</offline_mode>"
    }
}
