use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TTSVoice {
    pub id: String,
    pub name: String,
    pub language: String,
    pub gender: String,
    pub engine: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TTSRequest {
    pub text: String,
    pub voice_id: String,
    pub rate: f32,
    pub pitch: f32,
}

pub struct TTSEngine;

impl TTSEngine {
    pub fn get_voices() -> Vec<TTSVoice> {
        vec![
            // Francais — Gerard Sage en premier (default)
            TTSVoice { id: "fr-BE-GerardNeural".into(),  name: "Gerard - Sage (Voix grave)".into(), language: "fr".into(), gender: "male".into(),   engine: "edge".into() },
            TTSVoice { id: "fr-FR-DeniseNeural".into(),  name: "Denise (Francaise)".into(),         language: "fr".into(), gender: "female".into(), engine: "edge".into() },
            TTSVoice { id: "fr-FR-HenriNeural".into(),   name: "Henri (Francais)".into(),           language: "fr".into(), gender: "male".into(),   engine: "edge".into() },
            TTSVoice { id: "fr-FR-EloiseNeural".into(),  name: "Eloise (Francaise)".into(),         language: "fr".into(), gender: "female".into(), engine: "edge".into() },
            // English
            TTSVoice { id: "en-GB-RyanNeural".into(),    name: "Ryan - Sage (Deep voice)".into(),   language: "en".into(), gender: "male".into(),   engine: "edge".into() },
            TTSVoice { id: "en-US-JennyNeural".into(),   name: "Jenny (English US)".into(),         language: "en".into(), gender: "female".into(), engine: "edge".into() },
            TTSVoice { id: "en-US-GuyNeural".into(),     name: "Guy (English US)".into(),           language: "en".into(), gender: "male".into(),   engine: "edge".into() },
            TTSVoice { id: "en-GB-SoniaNeural".into(),   name: "Sonia (English UK)".into(),         language: "en".into(), gender: "female".into(), engine: "edge".into() },
            // Arabe
            TTSVoice { id: "ar-SA-HamedNeural".into(),   name: "Hamed - Hakim (Voix grave)".into(), language: "ar".into(), gender: "male".into(),   engine: "edge".into() },
            TTSVoice { id: "ar-SA-ZariyahNeural".into(), name: "Zariyah (Arabe)".into(),            language: "ar".into(), gender: "female".into(), engine: "edge".into() },
            TTSVoice { id: "ar-DZ-AminaNeural".into(),   name: "Amina (Algerienne)".into(),         language: "ar".into(), gender: "female".into(), engine: "edge".into() },
        ]
    }

    pub fn default_voice_for_language(language: &str) -> String {
        match language {
            "fr" => "fr-BE-GerardNeural".to_string(),
            "ar" => "ar-SA-HamedNeural".to_string(),
            _    => "en-GB-RyanNeural".to_string(),
        }
    }

    pub async fn synthesize(request: TTSRequest) -> Result<Vec<u8>, String> {
        let adjusted = Self::adjust_for_voice(&request);
        // Edge TTS via WebSocket — no SAPI fallback (causes window flash)
        // If this fails, frontend handles fallback via Web Speech API
        Self::synthesize_edge_blocking(adjusted).await
    }

    fn adjust_for_voice(req: &TTSRequest) -> TTSRequest {
        let (rate, pitch) = match req.voice_id.as_str() {
            "fr-BE-GerardNeural" => (req.rate * 0.88, req.pitch - 8.0),
            "en-GB-RyanNeural"   => (req.rate * 0.90, req.pitch - 5.0),
            "ar-SA-HamedNeural"  => (req.rate * 0.90, req.pitch - 5.0),
            _                    => (req.rate, req.pitch),
        };
        TTSRequest { text: req.text.clone(), voice_id: req.voice_id.clone(), rate, pitch }
    }

    async fn synthesize_edge_blocking(request: TTSRequest) -> Result<Vec<u8>, String> {
        tokio::task::spawn_blocking(move || {
            use msedge_tts::tts::{client::connect, SpeechConfig};
            use msedge_tts::voice::get_voices_list;

            let voices = get_voices_list()
                .map_err(|e| format!("Voice list: {}", e))?;

            let voice = voices.iter()
                .find(|v| v.short_name.as_deref() == Some(request.voice_id.as_str()))
                .ok_or_else(|| format!("Voice '{}' not found", request.voice_id))?;

            let mut config = SpeechConfig::from(voice);
            config.rate = ((request.rate - 1.0) * 100.0) as i32;
            config.pitch = request.pitch as i32;

            let mut client = connect()
                .map_err(|e| format!("WS connect: {}", e))?;

            let audio = client.synthesize(&request.text, &config)
                .map_err(|e| format!("Synth: {}", e))?;

            if audio.audio_bytes.is_empty() {
                return Err("Empty audio".to_string());
            }

            Ok(audio.audio_bytes)
        })
        .await
        .map_err(|e| format!("Task: {}", e))?
    }
}
