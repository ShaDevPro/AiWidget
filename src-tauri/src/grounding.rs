use chrono::Local;

/// Shared grounding helpers — temporal anchor + anti-hallucination rules (all domains).
pub struct Grounding;

impl Grounding {
    /// Injected into every system prompt so the model knows "today" and must not patch prior answers.
    pub fn temporal_system_block(lang: &str) -> String {
        let now = Local::now();
        let iso = now.format("%Y-%m-%d").to_string();
        let human = match lang {
            "en" => now.format("%A, %B %d, %Y — %H:%M").to_string(),
            "ar" => now.format("%Y-%m-%d %H:%M").to_string(),
            _ => now.format("%A %d %B %Y, %H:%M").to_string(),
        };

        format!(
            "\n\n<current_datetime iso=\"{iso}\">{human}</current_datetime>\n\
            <anti_hallucination>\n\
            Règles transverses (tous sujets : météo, prix, actu, sport, santé, tech, etc.) :\n\
            1. AUJOURD'HUI = la date ci-dessus. Toute info \"actuelle\", \"en ce moment\", \"dernière\", \"live\" doit être cohérente avec cette date.\n\
            2. INTERDIT de recopier une réponse assistant précédente en remplaçant dates, chiffres, noms ou lieux pour satisfaire l'utilisateur (pas de bricolage).\n\
            3. Si l'utilisateur demande précision, correction, confirmation ou conteste un fait : réponds UNIQUEMENT à partir des <search_results> frais ou de sources vérifiables ; sinon dis honnêtement que tu ne peux pas confirmer.\n\
            4. Si les sources sont absentes, contradictoires, ou datées d'avant aujourd'hui pour un sujet \"actuel\" : ne les présente pas comme vérité actuelle — signale l'incertitude.\n\
            5. L'historique du chat peut contenir des erreurs ; la correction de l'utilisateur prime sur tes messages précédents.\n\
            6. Ne devine jamais une date de fin, un prix, un score ou un chiffre non présent explicitement dans les sources.\n\
            </anti_hallucination>"
        )
    }

    pub fn web_mode_hint() -> &'static str {
        "\n\n<web_search_enabled>Résultats web en temps réel ci-dessous. \
        Synthétise UNIQUEMENT ce qui est dans <search_results> ; cite les faits ; \
        ne fabrique ni ne modifie dates/chiffres ; si insuffisant, dis-le.</web_search_enabled>"
    }

    pub fn offline_mode_hint() -> &'static str {
        "\n\n<offline_mode>Pas d'Internet. Ne fabrique jamais de données temps réel (météo, cours, scores, actu, prix). \
        Propose une recherche Web si l'utilisateur a besoin de faits récents.</offline_mode>"
    }
}
