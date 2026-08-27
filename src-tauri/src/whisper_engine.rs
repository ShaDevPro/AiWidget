use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhisperStatus {
    pub installed: bool,
    pub model_installed: bool,
    pub binary_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub text: String,
    pub language: String,
    pub is_ready: bool,
}

pub struct WhisperEngine;

impl WhisperEngine {
    pub fn get_whisper_dir() -> PathBuf {
        let mut dir = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
        dir.push("aiwidget");
        dir.push("whisper");
        dir
    }

    /// Binary kept as whisper-cli.exe (avoids deprecation warning from binary itself)
    fn binary_path() -> PathBuf {
        Self::get_whisper_dir().join("whisper-cli.exe")
    }

    pub fn get_status() -> WhisperStatus {
        let binary = Self::binary_path();
        let model = Self::get_whisper_dir().join("ggml-base.bin");
        WhisperStatus {
            installed: binary.exists(),
            model_installed: model.exists(),
            binary_path: binary.to_string_lossy().to_string(),
        }
    }

    pub fn is_ready() -> bool {
        let s = Self::get_status();
        s.installed && s.model_installed
    }

    pub async fn transcribe(audio_data: Vec<u8>, window: tauri::Window) -> Result<TranscriptionResult, String> {
        if !Self::is_ready() {
            return Ok(TranscriptionResult {
                text: String::new(),
                language: "fr".to_string(),
                is_ready: false,
            });
        }

        let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis();
        let tmp_dir = std::env::temp_dir();
        let wav_path = tmp_dir.join(format!("aiwidget_audio_{}.wav", ts));
        fs::write(&wav_path, &audio_data).map_err(|e| format!("Erreur ecriture audio: {}", e))?;

        let binary = Self::binary_path();
        let model = Self::get_whisper_dir().join("ggml-base.bin");
        let output_base = tmp_dir.join(format!("aiwidget_transcript_{}", ts));

        let _ = window.emit("whisper-progress", serde_json::json!({ "status": "transcribing" }));

        let mut cmd = std::process::Command::new(&binary);
        cmd.arg("-m").arg(&model)
            .arg("-f").arg(&wav_path)
            .arg("-l").arg("auto")
            .arg("--output-json")
            .arg("--no-timestamps")
            .arg("-of").arg(&output_base);

        // Prevent console window flash on Windows
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let out = cmd.output()
            .map_err(|e| format!("Erreur lancement whisper-cli: {}", e))?;

        let _ = fs::remove_file(&wav_path);

        // Language detection from stderr (whisper writes diagnostics there)
        let stderr_str = String::from_utf8_lossy(&out.stderr).to_string();
        let language = Self::detect_language_from_output(&stderr_str);

        // Parse JSON output file (most reliable — no warnings mixed in)
        let json_path = tmp_dir.join(format!("aiwidget_transcript_{}.json", ts));
        let text = if json_path.exists() {
            let json_str = fs::read_to_string(&json_path).unwrap_or_default();
            let _ = fs::remove_file(&json_path);
            Self::parse_whisper_json(&json_str)
        } else {
            // Fallback stdout, but strip all WARNING/diagnostic lines first
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            Self::clean_whisper_output(&stdout)
        };

        let text = Self::validate_transcription(text);
        eprintln!("[Whisper] result: {:?}  lang: {}", text, language);

        Ok(TranscriptionResult { text, language, is_ready: true })
    }

    /// Parse whisper --output-json format: { "transcription": [{ "text": "..." }] }
    fn parse_whisper_json(json_str: &str) -> String {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(json_str) {
            if let Some(segs) = val.get("transcription").and_then(|v| v.as_array()) {
                let texts: Vec<String> = segs.iter()
                    .filter_map(|s| s.get("text").and_then(|t| t.as_str()))
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect();
                if !texts.is_empty() { return texts.join(" "); }
            }
        }
        // Non-JSON fallback: strip diagnostic lines
        json_str.lines()
            .filter(|l| !l.trim().starts_with('[') && !l.trim().is_empty())
            .map(|l| l.trim())
            .collect::<Vec<_>>().join(" ")
    }

    /// Remove WARNING / diagnostic lines from raw stdout
    fn clean_whisper_output(raw: &str) -> String {
        raw.lines()
            .filter(|l| {
                let t = l.trim();
                !t.is_empty()
                && !t.starts_with("WARNING")
                && !t.starts_with("ERROR")
                && !t.starts_with("whisper_")
                && !t.starts_with("ggml_")
                && !t.starts_with("main:")
                && !t.starts_with('[')
                && !t.starts_with("system_info")
                && !t.starts_with("log_mel")
                && !t.starts_with("https://")
            })
            .map(|l| l.trim())
            .collect::<Vec<_>>()
            .join(" ")
            .trim()
            .to_string()
    }

    /// Reject transcriptions that are clearly invalid (only punctuation/spaces)
    fn validate_transcription(text: String) -> String {
        let trimmed = text.trim().to_string();
        let meaningful: String = trimmed.chars().filter(|c| c.is_alphabetic()).collect();
        if meaningful.len() < 2 { String::new() } else { trimmed }
    }

    fn detect_language_from_output(output: &str) -> String {
        if output.contains("language: fr") || output.contains("langue: fr") { "fr".to_string() }
        else if output.contains("language: ar") { "ar".to_string() }
        else if output.contains("language: en") { "en".to_string() }
        else { "fr".to_string() }
    }

    pub async fn download_all(window: tauri::Window) -> Result<(), String> {
        let dir = Self::get_whisper_dir();
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

        // Keep as whisper-cli.exe to match real binary name
        let binary = Self::binary_path();

        if !binary.exists() {
            let _ = window.emit("whisper-download-progress", serde_json::json!({
                "step": "binary", "percentage": 0, "status": "Telechargement du moteur whisper..."
            }));

            let zip_url = "https://github.com/ggml-org/whisper.cpp/releases/download/b4938/whisper-bin-x64.zip";
            let client = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(300))
                .user_agent("AI-Widget/1.0")
                .build().map_err(|e| e.to_string())?;

            let resp = client.get(zip_url).send().await.map_err(|e| e.to_string())?;
            if !resp.status().is_success() {
                return Err(format!("Erreur telechargement whisper: HTTP {}", resp.status()));
            }

            let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
            let _ = window.emit("whisper-download-progress", serde_json::json!({
                "step": "binary", "percentage": 50, "status": "Extraction..."
            }));

            let zip_path = dir.join("whisper-bin.zip");
            fs::write(&zip_path, &bytes).map_err(|e| e.to_string())?;
            let zip_file = fs::File::open(&zip_path).map_err(|e| e.to_string())?;
            let mut archive = zip::ZipArchive::new(zip_file).map_err(|e| e.to_string())?;

            let mut extracted = false;
            for i in 0..archive.len() {
                let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
                let name = file.name().to_string();
                // Extract all .exe and .dll files (whisper-cli needs its DLLs)
                let basename = std::path::Path::new(&name)
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                if basename.ends_with(".exe") || basename.ends_with(".dll") {
                    let out_path = dir.join(&basename);
                    let mut out_f = fs::File::create(&out_path).map_err(|e| e.to_string())?;
                    std::io::copy(&mut file, &mut out_f).map_err(|e| e.to_string())?;
                    eprintln!("[Whisper] Extracted: {}", basename);
                    if basename == "whisper-cli.exe" {
                        extracted = true;
                    }
                }
            }
            let _ = fs::remove_file(&zip_path);
            if !extracted {
                return Err("whisper-cli.exe introuvable dans l archive".to_string());
            }

            let _ = window.emit("whisper-download-progress", serde_json::json!({
                "step": "binary", "percentage": 100, "status": "Moteur installe"
            }));
        }

        let model = dir.join("ggml-base.bin");
        if !model.exists() {
            let _ = window.emit("whisper-download-progress", serde_json::json!({
                "step": "model", "percentage": 0, "status": "Telechargement du modele vocal (142 Mo)..."
            }));
            // GGML format required by whisper-cli (NOT PyTorch .pt)
            let model_url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin";
            let client = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(600))
                .user_agent("AI-Widget/1.0")
                .build().map_err(|e| e.to_string())?;
            use futures_util::StreamExt;
            let resp = client.get(model_url).send().await.map_err(|e| e.to_string())?;
            let total = resp.content_length().unwrap_or(150_000_000);
            let mut stream = resp.bytes_stream();
            let mut downloaded: u64 = 0;
            let mut buf: Vec<u8> = Vec::new();
            while let Some(chunk) = stream.next().await {
                let chunk = chunk.map_err(|e| e.to_string())?;
                downloaded += chunk.len() as u64;
                buf.extend_from_slice(&chunk);
                let pct = (downloaded * 100 / total) as f32;
                let _ = window.emit("whisper-download-progress", serde_json::json!({
                    "step": "model", "percentage": pct,
                    "status": format!("{:.1} Mo / {:.1} Mo", downloaded as f64/1_048_576.0, total as f64/1_048_576.0)
                }));
            }
            fs::write(&model, &buf).map_err(|e| e.to_string())?;
            let _ = window.emit("whisper-download-progress", serde_json::json!({
                "step": "model", "percentage": 100, "status": "Moteur vocal pret !"
            }));
        }

        Ok(())
    }
}
