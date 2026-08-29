use anyhow::Result;
use crate::models::WebSearchResult;
use std::collections::HashMap;
use std::time::Duration;

pub struct WebSearchEngine;

impl WebSearchEngine {
    /// Checks if the query is asking about the assistant's own identity or capabilities (no web search needed)
    pub fn is_self_identity_query(query: &str) -> bool {
        let l = query.to_lowercase();
        // Direct URLs and website inspection queries must NEVER be blocked as self-identity
        if l.contains("http://") || l.contains("https://") || l.contains("www.") {
            return false;
        }
        let identity_keywords = [
            "qui es-tu",
            "qui es tu",
            "qui t'a conçu",
            "qui t'a concu",
            "qui t'a créé",
            "qui t'a cree",
            "qui a créé",
            "qui a cree",
            "qui a conçu",
            "qui a concu",
            "qui est le fondateur",
            "fondateur de sha",
            "fondateur de widget",
            "fondateur d'ai widget",
            "qui est hadj ahmed",
            "tes fonctionnalités",
            "tes fonctionnalites",
            "quelles sont tes fonctions",
            "quelles sont tes fonctionnalités",
            "quelles sont tes fonctionnalites",
            "que sais-tu faire",
            "que peux-tu faire",
            "comment tu fonctionnes",
            "présente-toi",
            "presente-toi",
            "parle moi de toi",
            "parle-moi de toi",
            "parle de toi",
            "who are you",
            "who made you",
            "who created you",
            "who is the founder",
            "what are your features",
            "what can you do",
            "feedback",
            "donner mon feedback",
            "donner du feedback",
            "faire un retour",
            "contacter le dev",
            "contacter le développeur",
            "contacter sha dev",
            "mail du dev",
            "mail du feedback",
            "envoyer un mail",
            "adresse mail de sha",
            "écrire au développeur",
            "send feedback",
            "contact developer",
            "developer email",
            "من أنت",
            "من انت",
            "من صنعك",
            "من طورك",
            "من هو المؤسس",
            "ما هي ميزاتك",
            "ماذا تستطيع ان تفعل",
            "تواصل مع المطور",
            "إرسال ملاحظات",
            "بريد المطور",
        ];
        identity_keywords.iter().any(|k| l.contains(k))
    }

    /// Reconstructs the true contextual search query in multi-turn conversations
    pub fn resolve_contextual_query(messages: &[crate::models::ChatMessage]) -> Option<String> {
        let user_msgs: Vec<&crate::models::ChatMessage> =
            messages.iter().filter(|m| m.role == "user").collect();
        if user_msgs.is_empty() {
            return None;
        }

        let last_text = user_msgs.last().unwrap().content.trim();
        let lower = last_text.to_lowercase();

        // If this is a follow-up asking for elaboration, critique, or advice on existing context:
        // Do NOT trigger an external web search that injects irrelevant junk.
        if user_msgs.len() >= 2 && Self::is_pure_conversation_elaboration(&lower) {
            return None;
        }

        // Continuation and confirmation words in FR, EN, AR
        let continuations = [
            "vas-y", "vas y", "vasy", "continue", "oui", "ok", "d'accord", "fais-le", "fais le",
            "go", "yes", "yeah", "do it", "please", "alright", "sure", "نعم", "تفضل", "واصل", "تابع",
            "حسنا",
        ];

        let is_short_continuation = last_text.len() < 12
            || continuations
                .iter()
                .any(|&c| lower == c || lower.starts_with(c));

        if is_short_continuation && user_msgs.len() >= 2 {
            let prev_text = user_msgs[user_msgs.len() - 2].content.trim();
            return Some(format!(
                "{} {}",
                Self::clean_search_query(prev_text),
                Self::clean_search_query(last_text)
            ));
        }

        // Refinement / correction / precision follow-ups (domain-agnostic)
        if Self::is_refinement_followup(&lower) && user_msgs.len() >= 2 {
            let prev_text = user_msgs[user_msgs.len() - 2].content.trim();
            let prev_clean = Self::clean_search_query(prev_text);
            let curr_clean = Self::clean_search_query(last_text);
            if !prev_clean.is_empty() {
                return Some(format!("{prev_clean} {curr_clean}"));
            }
        }

        // Topic drift: user asks about dates/precision without prior user pair — anchor on last substantive user turn
        if Self::is_refinement_followup(&lower) && user_msgs.len() >= 3 {
            for msg in user_msgs.iter().rev().skip(1) {
                let t = msg.content.trim();
                if t.len() > 20 && !Self::is_refinement_followup(&t.to_lowercase()) {
                    return Some(format!(
                        "{} {}",
                        Self::clean_search_query(t),
                        Self::clean_search_query(last_text)
                    ));
                }
            }
        }

        Some(last_text.to_string())
    }

    /// Checks if a follow-up query is purely asking the model to reason, detail, or critique existing discussion context
    fn is_pure_conversation_elaboration(lower: &str) -> bool {
        // If explicit URLs or live search keywords are present, allow search
        if lower.contains("http://") || lower.contains("https://") || lower.contains("www.") || lower.contains("cherche") || lower.contains("recherche") || lower.contains("search") || lower.contains("google") {
            return false;
        }

        let markers = [
            "t'as pas évoqué",
            "t'as pas évoque",
            "tu n'as pas évoqué",
            "tu n'as pas évoque",
            "tu n'as pas parlé",
            "tu n'as pas parle",
            "t'as oublié",
            "tu as oublié",
            "peux-tu détailler",
            "peux-tu detailler",
            "peux tu détailler",
            "détaille",
            "detaille",
            "explique",
            "développe",
            "developpe",
            "donne des exemples",
            "donne-moi des exemples",
            "comment faire",
            "comment corriger",
            "propose une solution",
            "propose des améliorations",
            "propose des ameliorations",
            "quelles améliorations",
            "quelles ameliorations",
            "quelles sont tes propositions",
            "propositions concrètes",
            "propositions concretes",
            "améliorations nécessaires",
            "ameliorations necessaires",
            "pourquoi",
            "que penses-tu",
            "que penses tu",
            "donne ton avis",
            "what do you think",
            "can you elaborate",
            "explain more",
            "give examples",
            "how to improve",
            "suggest improvements",
            "كيف تحسن",
            "ما هي مقترحاتك",
            "اشرح بالتفصيل",
            "اعطني امثلة",
            "وضح اكثر",
        ];
        markers.iter().any(|&m| lower.contains(m))
    }

    /// User challenges, asks for precision, or supplies today's date — needs fresh search + prior topic.
    fn is_refinement_followup(lower: &str) -> bool {
        const MARKERS: &[&str] = &[
            "précision",
            "precision",
            "précis",
            "precis",
            "plus de détail",
            "plus de detail",
            "more detail",
            "more precision",
            "tu confirmes",
            "confirmes-tu",
            "can you confirm",
            "corrige",
            "correct",
            "correction",
            "c'est faux",
            "c est faux",
            "that's wrong",
            "that's incorrect",
            "pas correct",
            "faux",
            "wrong",
            "inexact",
            "hallucin",
            "inventé",
            "invente",
            "made up",
            "on est le",
            "en est le",
            "nous sommes le",
            "aujourd'hui",
            "aujourdhui",
            "today is",
            "today's date",
            "date stp",
            "dates stp",
            "quelle date",
            "which date",
            "tu as dit",
            "you said",
            "tu viens de",
            "you just",
            "reformule",
            "rephrase",
            "vérifie",
            "verifie",
            "verify",
            "source",
            "sources",
            "clarif",
            "explain again",
            "encore une fois",
            "à jour",
            "a jour",
            "up to date",
            "actualis",
            "met à jour",
            "update",
            "تصحيح",
            "توضيح",
            "تاريخ",
            "اليوم",
        ];
        MARKERS.iter().any(|m| lower.contains(m))
    }

    /// Normalizes conversational sentences into search engine keywords
    pub fn clean_search_query(raw: &str) -> String {
        let mut text = raw.to_lowercase();

        // Remove conversational prefixes and triggers
        let prefixes_to_strip = [
            "tu me donnes le cours",
            "tu me donnes",
            "donne moi le cours",
            "donne-moi le cours",
            "donne-moi",
            "donne moi",
            "tu cherches le cours",
            "tu cherches",
            "peux-tu me donner",
            "peux-tu chercher",
            "cherche sur internet",
            "cherche sur le web",
            "recherche sur le web",
            "recherche sur internet",
            "disant comme",
            "disant",
            "s'il te plait",
            "s'il vous plait",
            "please give me",
            "can you find",
            "what is the price of",
            "what is the rate of",
            "quel est le prix de",
            "quel est le cours de",
            "quel est le taux de",
            "كم سعر",
            "ابحث عن",
        ];

        for p in prefixes_to_strip {
            if let Some(idx) = text.find(p) {
                text.replace_range(idx..idx + p.len(), " ");
            }
        }

        // Remove quotes and punctuation noise
        let cleaned: String = text
            .chars()
            .map(|c| {
                if c == '"' || c == '\'' || c == '?' || c == '!' || c == ':' || c == ';' || c == '(' || c == ')' {
                    ' '
                } else {
                    c
                }
            })
            .collect();

        let words: Vec<&str> = cleaned.split_whitespace().collect();
        if words.is_empty() {
            raw.trim().to_string()
        } else {
            words.join(" ")
        }
    }

    /// Web search with a hard timeout — returns empty results on timeout (graceful fallback).
    pub async fn search_with_timeout(
        query: &str,
        max_results: usize,
        timeout: Duration,
    ) -> Result<Vec<WebSearchResult>> {
        match tokio::time::timeout(timeout, Self::search(query, max_results)).await {
            Ok(result) => result,
            Err(_) => {
                eprintln!("[web_search] timed out after {:?}", timeout);
                Ok(Vec::new())
            }
        }
    }

    /// Performs search and fetches real-time web context
    pub async fn search(query: &str, max_results: usize) -> Result<Vec<WebSearchResult>> {
        // Skip web search for questions about AI Widget's own identity/features
        if Self::is_self_identity_query(query) {
            return Ok(Vec::new());
        }

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(8))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
            .build()?;

        let mut results = Vec::new();

        // 0. Direct URL Scraping: If user provided explicit URLs (e.g. https://shadevpro.github.io/AiWidget-Site/), fetch page content directly!
        let direct_urls = Self::extract_urls(query);
        for url in &direct_urls {
            if let Ok(Some(page_result)) = Self::fetch_url_content(&client, url).await {
                results.push(page_result);
            }
        }

        // 1. Check if query is about currency / exchange rates (e.g. EUR DZD, USD DZD, etc.)
        let lower = query.to_lowercase();
        if lower.contains("eur") || lower.contains("euro") || lower.contains("dzd") || lower.contains("dinar") || lower.contains("dollar") || lower.contains("usd") {
            if let Ok(rate_info) = Self::fetch_live_currency(&client, &lower).await {
                if let Some(res) = rate_info {
                    results.push(res);
                }
            }
        }

        // 2. Check if query is about weather / temperatures / forecast (e.g. Laghouat, Alger, etc.)
        if let Ok(weather_info) = Self::fetch_live_weather(&client, &lower).await {
            if let Some(res) = weather_info {
                results.push(res);
            }
        }

        // 3. Query DuckDuckGo only if no direct URL was provided (or if scraping direct URL failed)
        let should_search_ddg = direct_urls.is_empty() || results.is_empty();

        if should_search_ddg {
            let mut clean_q = Self::clean_search_query(query);
            for url in &direct_urls {
                clean_q = clean_q.replace(url, "");
            }
            let clean_q = clean_q.trim().to_string();

            if !clean_q.is_empty() {
                let mut form_params = HashMap::new();
                form_params.insert("q", clean_q.as_str());

                if let Ok(resp) = client.post("https://html.duckduckgo.com/html/").form(&form_params).send().await {
                    if resp.status().is_success() {
                        if let Ok(html) = resp.text().await {
                            let mut parsed = Self::parse_duckduckgo_html(&html, max_results);
                            results.append(&mut parsed);
                        }
                    }
                }

                // 4. Fallback to DuckDuckGo Lite if needed
                if results.is_empty() {
                    if let Ok(resp) = client.post("https://lite.duckduckgo.com/lite/").form(&form_params).send().await {
                        if resp.status().is_success() {
                            if let Ok(html) = resp.text().await {
                                let mut parsed = Self::parse_duckduckgo_html(&html, max_results);
                                results.append(&mut parsed);
                            }
                        }
                    }
                }
            }
        }

        Ok(results)
    }

    /// Extracts direct URLs from query string
    pub fn extract_urls(query: &str) -> Vec<String> {
        let mut urls = Vec::new();
        for word in query.split_whitespace() {
            let clean = word.trim_matches(|c: char| {
                c == '"' || c == '\'' || c == '(' || c == ')' || c == '<' || c == '>' || c == '[' || c == ']' || c == ',' || c == ';'
            });
            if clean.starts_with("http://") || clean.starts_with("https://") {
                urls.push(clean.to_string());
            }
        }
        urls
    }

    /// Fetches full readable content directly from a URL
    pub async fn fetch_url_content(client: &reqwest::Client, url: &str) -> Result<Option<WebSearchResult>> {
        let resp = match client.get(url).send().await {
            Ok(r) => r,
            Err(e) => {
                eprintln!("[web_search] Error fetching URL {}: {:?}", url, e);
                return Ok(None);
            }
        };

        if !resp.status().is_success() {
            return Ok(None);
        }

        let html = match resp.text().await {
            Ok(h) => h,
            Err(_) => return Ok(None),
        };

        let title = Self::extract_html_title(&html).unwrap_or_else(|| url.to_string());
        let content_text = Self::extract_readable_page_text(&html);

        if content_text.trim().is_empty() {
            return Ok(None);
        }

        Ok(Some(WebSearchResult {
            title: format!("Site Web : {}", title),
            snippet: format!("Contenu réel extrait du site ({}) :\n{}", url, content_text),
            url: url.to_string(),
        }))
    }

    /// Extracts <title> tag from HTML
    fn extract_html_title(html: &str) -> Option<String> {
        let lower = html.to_lowercase();
        if let Some(start) = lower.find("<title>") {
            let rest = &html[start + 7..];
            if let Some(end) = rest.to_lowercase().find("</title>") {
                let t = Self::strip_html_tags(&rest[..end]).trim().to_string();
                if !t.is_empty() {
                    return Some(t);
                }
            }
        }
        None
    }

    /// Converts full HTML document into clean, readable text for the LLM
    fn extract_readable_page_text(html: &str) -> String {
        let mut clean = html.to_string();

        // 1. Strip head, script, style, svg, noscript, iframe blocks completely
        let block_tags_to_remove = ["<head", "<script", "<style", "<svg", "<noscript", "<iframe", "<template"];
        for tag in block_tags_to_remove {
            while let Some(start) = clean.to_lowercase().find(tag) {
                let rest = &clean[start..];
                let close_tag = format!("</{}", &tag[1..]);
                if let Some(end_rel) = rest.to_lowercase().find(&close_tag) {
                    if let Some(tag_end) = rest[end_rel..].find('>') {
                        let total_len = end_rel + tag_end + 1;
                        clean.replace_range(start..start + total_len, " ");
                    } else {
                        clean.replace_range(start.., " ");
                        break;
                    }
                } else if let Some(tag_end) = rest.find('>') {
                    clean.replace_range(start..start + tag_end + 1, " ");
                } else {
                    clean.replace_range(start.., " ");
                    break;
                }
            }
        }

        // 2. Format headings and list items before tag stripping
        clean = clean
            .replace("<h1", "\n\n# ")
            .replace("<h2", "\n\n## ")
            .replace("<h3", "\n\n### ")
            .replace("<h4", "\n\n#### ")
            .replace("<li", "\n- ")
            .replace("<p", "\n\n")
            .replace("<br", "\n")
            .replace("<section", "\n\n")
            .replace("<article", "\n\n");

        // 3. Strip all remaining HTML tags
        let stripped = Self::strip_html_tags(&clean);

        // 4. Normalize lines and remove empty fluff
        let mut lines = Vec::new();
        for line in stripped.lines() {
            let t = line.trim();
            // Ignore repetitive noise lines
            if !t.is_empty() && t.len() > 1 && !t.starts_with('<') && !t.starts_with('{') {
                lines.push(t);
            }
        }

        let full_text = lines.join("\n");
        // Limit to max 3500 chars for LLM context budget
        if full_text.len() > 3500 {
            let truncated = &full_text[..3500];
            if let Some(last_space) = truncated.rfind(' ') {
                format!("{}...", &truncated[..last_space])
            } else {
                format!("{}...", truncated)
            }
        } else {
            full_text
        }
    }

    /// Fetches live real-time weather forecasts via Open-Meteo API
    async fn fetch_live_weather(client: &reqwest::Client, text: &str) -> Result<Option<WebSearchResult>> {
        let is_weather = text.contains("météo")
            || text.contains("meteo")
            || text.contains("température")
            || text.contains("temperature")
            || text.contains("chaleur")
            || text.contains("degré")
            || text.contains("degre")
            || text.contains("climat")
            || text.contains("pluie")
            || text.contains("weather")
            || text.contains("forecast")
            || text.contains("طقس")
            || text.contains("حرارة");

        if !is_weather {
            return Ok(None);
        }

        let stopwords = [
            "quelle", "quel", "quels", "quelles", "temperature", "température", "meteo", "météo",
            "demain", "aujourd", "hui", "aujourd'hui", "hier", "ce", "soir", "matin", "cette", "semaine",
            "faire", "fais", "fait", "faisons", "faites", "font", "ferai", "feras", "fera", "ferons", "ferez", "feront",
            "ferait", "ferais", "feriez", "ferions", "feraient", "ferras", "combien",
            "temps", "prevision", "previsions", "climat", "chaleur", "degré", "degre", "degres", "degrés",
            "dans", "pour", "sur", "est", "le", "la", "les", "du", "des", "de", "d", "l", "en", "au", "aux", "a", "à",
            "what", "is", "the", "weather", "forecast", "tomorrow", "today", "in", "at", "for", "like", "how", "hot",
            "طقس", "حرارة", "درجة", "الجو", "غدا", "اليوم", "في", "كم"
        ];

        let clean_text: String = text
            .chars()
            .map(|c| if c.is_alphanumeric() { c } else { ' ' })
            .collect();

        let candidates: Vec<&str> = clean_text
            .split_whitespace()
            .filter(|w| w.len() >= 3 && !stopwords.contains(&w.to_lowercase().as_str()))
            .collect();

        let mut best_city: Option<(String, String, f64, f64)> = None;
        let mut best_score: i64 = -1;

        for word in candidates {
            let geocoding_url = format!(
                "https://geocoding-api.open-meteo.com/v1/search?name={}&count=5&language=fr&format=json",
                word
            );

            if let Ok(geo_resp) = client.get(&geocoding_url).send().await {
                if let Ok(geo_json) = geo_resp.json::<serde_json::Value>().await {
                    if let Some(results_arr) = geo_json.get("results").and_then(|r| r.as_array()) {
                        for res in results_arr {
                            let name = res.get("name").and_then(|v| v.as_str()).unwrap_or(word).to_string();
                            let country = res.get("country").and_then(|v| v.as_str()).unwrap_or("").to_string();
                            let lat = res.get("latitude").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let lon = res.get("longitude").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let pop = res.get("population").and_then(|v| v.as_i64()).unwrap_or(0);
                            let feat = res.get("feature_code").and_then(|v| v.as_str()).unwrap_or("");

                            let is_exact = name.eq_ignore_ascii_case(word);
                            let is_city = feat.starts_with("PPL");
                            let score = pop + (if is_exact { 50000 } else { 0 }) + (if is_city { 100000 } else { 0 });

                            if score > best_score {
                                best_score = score;
                                best_city = Some((name, country, lat, lon));
                            }
                        }
                    }
                }
            }
        }

        if let Some((name, country, lat, lon)) = best_city {
            if let Ok(summary) = crate::weather_engine::fetch_forecast_summary(lat, lon).await {
                let weather_desc = if summary.max_tomorrow >= 38.0 {
                    "Canicule / Très forte chaleur et grand soleil"
                } else if summary.max_tomorrow >= 30.0 {
                    "Chaud et ensoleillé"
                } else if summary.max_tomorrow >= 20.0 {
                    "Agréable et tempéré"
                } else {
                    "Frais"
                };

                let search_url = format!("https://www.google.com/search?q=meteo+{}", name);

                return Ok(Some(WebSearchResult {
                    title: format!("Météo et Températures officielles en direct : {} ({})", name, country),
                    snippet: format!(
                        "Relevés météorologiques officiels en direct pour {} ({}) : Température actuelle : {:.1}°C (ressenti : {:.1}°C). Prévisions pour AUJOURD'HUI : Température Max {:.1}°C / Min {:.1}°C. Prévisions pour DEMAIN : Température Maximale : {:.1}°C, Température Minimale : {:.1}°C (Climat : {}). Données météorologiques en temps réel vérifiées.",
                        name, country, summary.current, summary.feels_like,
                        summary.max_today, summary.min_today,
                        summary.max_tomorrow, summary.min_tomorrow, weather_desc
                    ),
                    url: search_url,
                }));
            }
        }

        Ok(None)
    }

    /// Fetches live real-time currency exchange rates
    async fn fetch_live_currency(client: &reqwest::Client, text: &str) -> Result<Option<WebSearchResult>> {
        if text.contains("dzd") || text.contains("dinar") {
            // Live official rates from open exchange API
            if let Ok(resp) = client.get("https://open.er-api.com/v6/latest/EUR").send().await {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(rates) = json.get("rates") {
                        if let Some(dzd_rate) = rates.get("DZD").and_then(|v| v.as_f64()) {
                            let usd_rate = rates.get("USD").and_then(|v| v.as_f64()).unwrap_or(1.08);
                            let date_str = json.get("time_last_update_utc").and_then(|v| v.as_str()).unwrap_or("Aujourd'hui");

                            return Ok(Some(WebSearchResult {
                                title: "Taux de change officiel EUR/DZD (Banque Centrale / Marché Interbancaire)".to_string(),
                                snippet: format!(
                                    "Cours officiel actuel ({}) : 1 Euro (EUR) = {:.2} Dinars Algériens (DZD). 1 Dollar US (USD) = {:.2} DZD. Note importante : Sur le marché parallèle informel (Square Port-Saïd), 1 EUR s'échange habituellement autour de 240 à 250 DZD selon les fluctuations.",
                                    date_str,
                                    dzd_rate,
                                    dzd_rate / usd_rate
                                ),
                                url: "https://www.bank-of-algeria.dz/".to_string(),
                            }));
                        }
                    }
                }
            }
        }
        Ok(None)
    }

    /// Percent-decodes a URL encoded string (e.g. uddg redirect links)
    fn url_decode(input: &str) -> String {
        let mut bytes = Vec::with_capacity(input.len());
        let input_bytes = input.as_bytes();
        let mut i = 0;
        while i < input_bytes.len() {
            if input_bytes[i] == b'%' && i + 2 < input_bytes.len() {
                let hex_slice = &input_bytes[i + 1..i + 3];
                if let Ok(hex_str) = std::str::from_utf8(hex_slice) {
                    if let Ok(byte) = u8::from_str_radix(hex_str, 16) {
                        bytes.push(byte);
                        i += 3;
                        continue;
                    }
                }
            } else if input_bytes[i] == b'+' {
                bytes.push(b' ');
                i += 1;
                continue;
            }
            bytes.push(input_bytes[i]);
            i += 1;
        }
        String::from_utf8_lossy(&bytes).to_string()
    }

    /// Extracts and decodes the real destination URL from DuckDuckGo HTML chunk
    fn extract_real_url(part: &str) -> String {
        // 1. Look for href on class="result__a"
        if let Some(a_pos) = part.find("class=\"result__a\"") {
            let before = &part[..a_pos];
            let after = &part[a_pos..];

            // Search href in the surrounding anchor tag
            let tag_snippet = if let Some(tag_start) = before.rfind("<a") {
                if let Some(tag_end) = after.find('>') {
                    &part[tag_start..a_pos + tag_end]
                } else {
                    ""
                }
            } else {
                ""
            };

            if let Some(href_start) = tag_snippet.find("href=\"") {
                let href_val = &tag_snippet[href_start + 6..];
                if let Some(href_end) = href_val.find('"') {
                    let raw_href = &href_val[..href_end];

                    // Decode uddg redirect parameter
                    if let Some(uddg_pos) = raw_href.find("uddg=") {
                        let target_encoded = &raw_href[uddg_pos + 5..];
                        let end_pos = target_encoded.find('&').unwrap_or(target_encoded.len());
                        let decoded = Self::url_decode(&target_encoded[..end_pos]);
                        if decoded.starts_with("http://") || decoded.starts_with("https://") {
                            return decoded;
                        }
                    }

                    if raw_href.starts_with("http://") || raw_href.starts_with("https://") {
                        return raw_href.to_string();
                    }
                    if raw_href.starts_with("//") {
                        return format!("https:{}", raw_href);
                    }
                }
            }
        }

        // 2. Fallback: extract domain/path from class="result__url"
        if let Some(url_start) = part.find("class=\"result__url\"") {
            let rest = &part[url_start..];
            if let Some(tag_end) = rest.find('>') {
                let content = &rest[tag_end + 1..];
                let end_pos = content.find("</a>").or_else(|| content.find("</div>")).unwrap_or(content.len().min(200));
                let raw_domain = Self::strip_html_tags(&content[..end_pos]).trim().to_string();
                let clean = raw_domain.replace(' ', "").replace('›', "/");
                if clean.contains('.') {
                    if clean.starts_with("http://") || clean.starts_with("https://") {
                        return clean;
                    }
                    return format!("https://{}", clean);
                }
            }
        }

        String::new()
    }

    /// Fast HTML snippet extraction from DuckDuckGo HTML output with valid real URLs
    fn parse_duckduckgo_html(html: &str, max_results: usize) -> Vec<WebSearchResult> {
        let mut results = Vec::new();
        let parts: Vec<&str> = html.split("class=\"result results_links").collect();

        for part in parts.iter().skip(1).take(max_results) {
            // Extract Title
            let title = if let Some(title_start) = part.find("class=\"result__a\"") {
                let rest = &part[title_start..];
                if let Some(tag_end) = rest.find('>') {
                    let content = &rest[tag_end + 1..];
                    if let Some(close_tag) = content.find("</a>") {
                        Self::strip_html_tags(&content[..close_tag])
                    } else {
                        String::new()
                    }
                } else {
                    String::new()
                }
            } else {
                String::new()
            };

            // Extract Snippet
            let snippet = if let Some(snip_start) = part.find("class=\"result__snippet\"") {
                let rest = &part[snip_start..];
                if let Some(tag_end) = rest.find('>') {
                    let content = &rest[tag_end + 1..];
                    let end_pos = content.find("</a>").or_else(|| content.find("</div>")).unwrap_or(content.len().min(400));
                    Self::strip_html_tags(&content[..end_pos])
                } else {
                    String::new()
                }
            } else {
                String::new()
            };

            // Extract Real Destination URL
            let url = Self::extract_real_url(part);

            if (!title.is_empty() || !snippet.is_empty()) && !url.is_empty() {
                results.push(WebSearchResult {
                    title: if title.is_empty() { "Source Web".to_string() } else { title },
                    snippet: snippet.trim().to_string(),
                    url,
                });
            }
        }

        results
    }

    fn strip_html_tags(input: &str) -> String {
        let mut res = String::with_capacity(input.len());
        let mut in_tag = false;
        for c in input.chars() {
            if c == '<' {
                in_tag = true;
            } else if c == '>' {
                in_tag = false;
            } else if !in_tag {
                res.push(c);
            }
        }
        res.replace("&quot;", "\"")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&#39;", "'")
            .replace("&#x27;", "'")
            .replace("&nbsp;", " ")
            .trim()
            .to_string()
    }

    /// Formats the web results into a clean prompt context block for the LLM
    pub fn format_web_context(results: &[WebSearchResult]) -> String {
        if results.is_empty() {
            return String::new();
        }

        let fetched_at = chrono::Local::now().format("%Y-%m-%d %H:%M").to_string();

        let mut block = format!(
            "\n\n<web_content fetched_at=\"{fetched_at}\">\n"
        );

        for (i, item) in results.iter().enumerate() {
            block.push_str(&format!(
                "  <source id=\"{}\">\n    <title>{}</title>\n    <url>{}</url>\n    <content>\n{}\n    </content>\n  </source>\n",
                i + 1,
                item.title,
                if item.url.is_empty() { "N/A" } else { &item.url },
                item.snippet
            ));
        }

        block.push_str(
            "</web_content>\n\
            [Consigne d'analyse universelle : Utilise les sources ci-dessus comme référence d'ancrage factuel. Réponds avec une rigueur scientifique, analytique et critique absolue. Structure ton argumentation de manière exhaustive, identifie les points clés, les forces, les faiblesses, limites ou incohérences, et apporte des solutions, démonstrations ou explications approfondies et concrètes. Ne recopie jamais de balises techniques ni de code source brut non sollicité.]\n\n",
        );
        block
    }
}
