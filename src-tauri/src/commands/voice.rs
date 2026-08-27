use crate::tts_engine::{TTSEngine, TTSRequest, TTSVoice};
use crate::whisper_engine::{TranscriptionResult, WhisperEngine, WhisperStatus};

#[tauri::command]
pub fn list_tts_voices() -> Vec<TTSVoice> {
    TTSEngine::get_voices()
}

#[tauri::command]
pub async fn synthesize_speech(text: String, voice_id: String, rate: f32, pitch: f32) -> Result<Vec<u8>, String> {
    TTSEngine::synthesize(TTSRequest { text, voice_id, rate, pitch }).await
}

#[tauri::command]
pub async fn transcribe_audio(audio_data: Vec<u8>, window: tauri::Window) -> Result<TranscriptionResult, String> {
    WhisperEngine::transcribe(audio_data, window).await
}

#[tauri::command]
pub fn get_whisper_status() -> WhisperStatus {
    WhisperEngine::get_status()
}

#[tauri::command]
pub async fn download_whisper(window: tauri::Window) -> Result<(), String> {
    WhisperEngine::download_all(window).await
}
