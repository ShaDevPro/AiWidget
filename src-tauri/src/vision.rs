/// Vision / multimodal model detection and image helpers.

const VISION_PATTERNS: &[&str] = &[
    "llava",
    "moondream",
    "minicpm-v",
    "qwen2-vl",
    "qwen2.5vl",
    "qwen3-vl",
    "bakllava",
    "llama3.2-vision",
    "llama4",
    "gemma3",
    "vision",
    "vl-",
    "-vl",
    "cogvlm",
    "internvl",
];

pub fn is_vision_model(model: &str) -> bool {
    let m = model.to_lowercase();
    VISION_PATTERNS.iter().any(|p| m.contains(p))
}

pub fn read_image_file_base64(path: &std::path::Path) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    let bytes = std::fs::read(path).map_err(|e| format!("Failed to read image: {e}"))?;
    Ok(STANDARD.encode(bytes))
}
