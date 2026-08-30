use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SDStatus {
    pub installed: bool,
    pub model_installed: bool,
    pub binary_path: String,
    pub model_name: String,
    pub available_models: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenerationResult {
    pub image_base64: String,
    pub file_path: String,
    pub prompt: String,
    pub width: u32,
    pub height: u32,
    pub duration_ms: u64,
}

static SD_GENERATION_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

pub struct SDEngine;

impl SDEngine {
    pub fn get_sd_dir() -> PathBuf {
        let mut dir = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
        dir.push("aiwidget");
        dir.push("sd");
        dir
    }

    pub fn get_images_dir() -> PathBuf {
        let mut dir = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
        dir.push("aiwidget");
        dir.push("generated_images");
        if !dir.exists() {
            let _ = fs::create_dir_all(&dir);
        }
        dir
    }

    pub fn binary_path() -> PathBuf {
        let dir = Self::get_sd_dir();
        let cli = dir.join("sd-cli.exe");
        if cli.exists() {
            return cli;
        }
        let sd = dir.join("sd.exe");
        if sd.exists() {
            return sd;
        }
        let srv = dir.join("sd-server.exe");
        if srv.exists() {
            return srv;
        }
        cli
    }

    pub fn default_model_path() -> PathBuf {
        Self::get_sd_dir().join("juggernautXL_v8Rundiffusion.safetensors")
    }

    pub fn get_active_model_path(preferred: Option<&str>) -> Option<PathBuf> {
        let dir = Self::get_sd_dir();
        if let Some(pref) = preferred {
            if !pref.trim().is_empty() {
                let path = dir.join(pref.trim());
                if path.exists() {
                    return Some(path);
                }
            }
        }

        let jugg = dir.join("juggernautXL_v8Rundiffusion.safetensors");
        if jugg.exists() {
            return Some(jugg);
        }

        let sd15 = dir.join("stable-diffusion-v1-5-pruned-emaonly-Q4_0.gguf");
        if sd15.exists() {
            return Some(sd15);
        }

        if dir.exists() {
            if let Ok(entries) = fs::read_dir(&dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if let Some(ext) = path.extension() {
                        if ext == "gguf" || ext == "safetensors" || ext == "ckpt" {
                            return Some(path);
                        }
                    }
                }
            }
        }
        None
    }

    pub fn get_status() -> SDStatus {
        let binary = Self::binary_path();
        let sd_dir = Self::get_sd_dir();

        let mut available_models = Vec::new();
        let mut model_name = String::new();

        if sd_dir.exists() {
            if let Ok(entries) = fs::read_dir(&sd_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if let Some(ext) = path.extension() {
                        if ext == "gguf" || ext == "safetensors" || ext == "ckpt" {
                            if let Some(file_name) = path.file_name() {
                                let name_str = file_name.to_string_lossy().to_string();
                                if model_name.is_empty() {
                                    model_name = name_str.clone();
                                }
                                available_models.push(name_str);
                            }
                        }
                    }
                }
            }
        }

        let model_installed = !model_name.is_empty();

        SDStatus {
            installed: binary.exists(),
            model_installed,
            binary_path: binary.to_string_lossy().to_string(),
            model_name,
            available_models,
        }
    }

    pub fn is_ready() -> bool {
        let s = Self::get_status();
        s.installed && s.model_installed
    }

    pub async fn download_model_by_key(model_key: &str, window: tauri::Window) -> Result<(), String> {
        let dir = Self::get_sd_dir();
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

        let binary = Self::binary_path();

        // 1. Download SD.cpp binary zip if missing
        if !binary.exists() {
            let _ = window.emit("sd-download-progress", serde_json::json!({
                "step": "binary", "percentage": 0, "status": "Téléchargement du moteur Stable Diffusion (SD.cpp Vulkan/CPU)..."
            }));

            let zip_urls = [
                "https://github.com/leejet/stable-diffusion.cpp/releases/download/master-829-0a565f2/sd-master-0a565f2-bin-win-vulkan-x64.zip",
                "https://github.com/leejet/stable-diffusion.cpp/releases/download/master-829-0a565f2/sd-master-0a565f2-bin-win-cpu-x64.zip",
            ];

            let client = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(300))
                .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Widget/1.0")
                .build().map_err(|e| e.to_string())?;

            let mut zip_bytes = None;
            for url in &zip_urls {
                if let Ok(resp) = client.get(*url).send().await {
                    if resp.status().is_success() {
                        if let Ok(bytes) = resp.bytes().await {
                            zip_bytes = Some(bytes);
                            break;
                        }
                    }
                }
            }

            let bytes = zip_bytes.ok_or_else(|| "Impossible de télécharger le binaire Stable Diffusion depuis GitHub Releases".to_string())?;

            let _ = window.emit("sd-download-progress", serde_json::json!({
                "step": "binary", "percentage": 70, "status": "Extraction des fichiers du moteur..."
            }));

            let zip_path = dir.join("sd-bin.zip");
            fs::write(&zip_path, &bytes).map_err(|e| e.to_string())?;
            let zip_file = fs::File::open(&zip_path).map_err(|e| e.to_string())?;
            let mut archive = zip::ZipArchive::new(zip_file).map_err(|e| e.to_string())?;

            let mut extracted = false;
            for i in 0..archive.len() {
                let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
                let name = file.name().to_string();
                let basename = std::path::Path::new(&name)
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                if basename.ends_with(".exe") || basename.ends_with(".dll") {
                    let out_path = dir.join(&basename);
                    let mut out_f = fs::File::create(&out_path).map_err(|e| e.to_string())?;
                    std::io::copy(&mut file, &mut out_f).map_err(|e| e.to_string())?;
                    if basename == "sd-cli.exe" || basename == "sd.exe" || basename == "sd-server.exe" {
                        extracted = true;
                    }
                }
            }
            let _ = fs::remove_file(&zip_path);
            if !extracted && !Self::binary_path().exists() {
                return Err("sd-cli.exe introuvable dans l'archive téléchargée".to_string());
            }

            let _ = window.emit("sd-download-progress", serde_json::json!({
                "step": "binary", "percentage": 100, "status": "Moteur Stable Diffusion installé !"
            }));
        }

        // 2. Download requested model
        let (model_filename, model_url, model_desc, expected_size) = if model_key == "sd15" {
            (
                "stable-diffusion-v1-5-pruned-emaonly-Q4_0.gguf",
                "https://huggingface.co/second-state/stable-diffusion-v1-5-GGUF/resolve/main/stable-diffusion-v1-5-pruned-emaonly-Q4_0.gguf",
                "SD 1.5 Rapide (1.5 Go)",
                1_566_768_416u64,
            )
        } else {
            (
                "juggernautXL_v8Rundiffusion.safetensors",
                "https://huggingface.co/lllyasviel/fav_models/resolve/main/fav/juggernautXL_v8Rundiffusion.safetensors",
                "Fooocus Juggernaut XL v8 (6.6 Go)",
                7_105_348_592u64,
            )
        };

        let model_path = dir.join(model_filename);
        let _ = window.emit("sd-download-progress", serde_json::json!({
            "step": "model", "percentage": 0, "status": format!("Téléchargement de {}...", model_desc)
        }));

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(3600))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Widget/1.0")
            .build().map_err(|e| e.to_string())?;

        use futures_util::StreamExt;
        let resp = client.get(model_url).send().await.map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            return Err(format!("Erreur téléchargement {} : HTTP {}", model_desc, resp.status()));
        }

        let total = resp.content_length().unwrap_or(expected_size);
        let mut stream = resp.bytes_stream();
        let mut downloaded: u64 = 0;
        let mut file = fs::File::create(&model_path).map_err(|e| e.to_string())?;
        let mut last_emit = Instant::now();

        use std::io::Write;
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| e.to_string())?;
            downloaded += chunk.len() as u64;
            file.write_all(&chunk).map_err(|e| e.to_string())?;

            if last_emit.elapsed().as_millis() > 250 {
                let pct = ((downloaded as f64 / total as f64) * 100.0) as f32;
                let downloaded_gb = downloaded as f64 / 1_073_741_824.0;
                let total_gb = total as f64 / 1_073_741_824.0;
                let _ = window.emit("sd-download-progress", serde_json::json!({
                    "step": "model",
                    "percentage": pct.min(99.0),
                    "status": format!("Téléchargement {} : {:.2} / {:.2} Go ({:.0}%)", model_desc, downloaded_gb, total_gb, pct)
                }));
                last_emit = Instant::now();
            }
        }

        let _ = window.emit("sd-download-progress", serde_json::json!({
            "step": "model", "percentage": 100, "status": format!("{} installé et prêt !", model_desc)
        }));

        Ok(())
    }

    pub async fn download_all(window: tauri::Window) -> Result<(), String> {
        Self::download_model_by_key("juggernaut", window).await
    }

    pub async fn generate_image(
        prompt: String,
        negative_prompt: Option<String>,
        width: u32,
        height: u32,
        steps: u32,
        seed: Option<i64>,
        preferred_model: Option<String>,
        window: tauri::Window,
    ) -> Result<ImageGenerationResult, String> {
        // Verrouillage strict : une seule génération d'image à la fois pour protéger la mémoire RAM
        let _guard = SD_GENERATION_LOCK.lock().await;

        let model = Self::get_active_model_path(preferred_model.as_deref()).ok_or_else(|| {
            "Le modèle d'image Stable Diffusion n'est pas encore installé. Veuillez le télécharger dans les paramètres.".to_string()
        })?;

        let binary = Self::binary_path();
        if !binary.exists() {
            return Err("L'exécutable sd.exe n'est pas installé. Veuillez télécharger le moteur dans les paramètres.".to_string());
        }

        let start_time = Instant::now();
        let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis();
        let images_dir = Self::get_images_dir();
        let output_file = images_dir.join(format!("aiwidget_img_{}.png", ts));

        let model_name_lower = model.to_string_lossy().to_lowercase();
        let is_sdxl = model_name_lower.contains("xl") || model_name_lower.contains("juggernaut") || model_name_lower.contains("safetensors");

        let (w, h, cfg_scale, default_steps) = if is_sdxl {
            // SDXL (Juggernaut XL) must be generated at 1024x1024 to prevent latent space collapse and dark artifacts
            let target_w = if width == 0 || width < 768 { 1024 } else { (width / 64) * 64 };
            let target_h = if height == 0 || height < 768 { 1024 } else { (height / 64) * 64 };
            (target_w, target_h, 4.0f32, 15u32)
        } else {
            // SD 1.5 standard resolution
            let target_w = if width == 0 { 512 } else { (width / 64) * 64 };
            let target_h = if height == 0 { 512 } else { (height / 64) * 64 };
            (target_w, target_h, 7.0f32, 15u32)
        };

        let st = if steps == 0 { default_steps } else { steps.clamp(4, 40) };
        let s = seed.unwrap_or(-1);
        let threads = std::thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(8)
            .min(16);

        let _ = window.emit("sd-generation-progress", serde_json::json!({
            "status": "starting",
            "prompt": prompt,
            "percentage": 5,
            "message": if is_sdxl { "Initialisation Fooocus SDXL Juggernaut (1024x1024)..." } else { "Initialisation SD 1.5 Rapide..." }
        }));

        let mut cmd = std::process::Command::new(&binary);
        cmd.arg("-m").arg(&model)
            .arg("-p").arg(&prompt)
            .arg("-W").arg(w.to_string())
            .arg("-H").arg(h.to_string())
            .arg("--steps").arg(st.to_string())
            .arg("--cfg-scale").arg(format!("{:.1}", cfg_scale))
            .arg("--sampling-method").arg("euler_a")
            .arg("-t").arg(threads.to_string())
            .arg("-s").arg(s.to_string())
            .arg("--vae-tiling")
            .arg("--vae-on-cpu")
            .arg("-o").arg(&output_file);

        if let Some(ref neg) = negative_prompt {
            if !neg.trim().is_empty() {
                cmd.arg("-n").arg(neg.trim());
            }
        }

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        use std::process::Stdio;
        cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| format!("Erreur lancement sd-cli.exe : {}", e))?;
        let stdout = child.stdout.take();
        let stderr = child.stderr.take();
        let window_clone = window.clone();
        let window_clone2 = window.clone();

        fn process_stream<R: std::io::Read + Send + 'static>(stream: Option<R>, win: tauri::Window) -> std::thread::JoinHandle<String> {
            std::thread::spawn(move || {
                let mut captured = String::new();
                if let Some(r) = stream {
                    use std::io::Read;
                    let mut reader = std::io::BufReader::new(r);
                    let mut current_line = String::new();
                    let mut byte = [0u8; 1];

                    while let Ok(1) = reader.read(&mut byte) {
                        let ch = byte[0] as char;
                        if ch == '\r' || ch == '\n' {
                            if !current_line.is_empty() {
                                captured.push_str(&current_line);
                                captured.push('\n');

                                if let Some(slash_idx) = current_line.find('/') {
                                    let before = current_line[..slash_idx].split_whitespace().last().unwrap_or("");
                                    let after = current_line[slash_idx + 1..].split_whitespace().next().unwrap_or("");
                                    if let (Ok(cur), Ok(tot)) = (before.parse::<u32>(), after.parse::<u32>()) {
                                        if tot > 0 && cur <= tot {
                                            let pct = 10.0 + ((cur as f32 / tot as f32) * 75.0);
                                            let _ = win.emit("sd-generation-progress", serde_json::json!({
                                                "status": "sampling",
                                                "current_step": cur,
                                                "total_steps": tot,
                                                "percentage": pct,
                                                "message": format!("Échantillonnage : Étape {} / {}", cur, tot)
                                            }));
                                        }
                                    }
                                } else if current_line.contains("decoding") || current_line.contains("decode_first_stage") {
                                    let _ = win.emit("sd-generation-progress", serde_json::json!({
                                        "status": "decoding",
                                        "percentage": 92.0,
                                        "message": "Décodage haute fidélité..."
                                    }));
                                }

                                current_line.clear();
                            }
                        } else {
                            current_line.push(ch);
                        }
                    }
                }
                captured
            })
        }

        let stdout_handle = process_stream(stdout, window_clone);
        let stderr_handle = process_stream(stderr, window_clone2);

        let status = child.wait().map_err(|e| format!("Erreur exécution sd.exe : {}", e))?;
        let _captured_stdout = stdout_handle.join().unwrap_or_default();
        let captured_stderr = stderr_handle.join().unwrap_or_default();

        if !output_file.exists() || !status.success() {
            return Err(format!("Échec de génération de l'image. Détails : {}", captured_stderr));
        }

        let img_bytes = fs::read(&output_file).map_err(|e| format!("Erreur lecture image générée : {}", e))?;
        use base64::{engine::general_purpose, Engine as _};
        let b64 = general_purpose::STANDARD.encode(&img_bytes);
        let image_base64 = format!("data:image/png;base64,{}", b64);

        let duration_ms = start_time.elapsed().as_millis() as u64;

        Ok(ImageGenerationResult {
            image_base64,
            file_path: output_file.to_string_lossy().to_string(),
            prompt,
            width: w,
            height: h,
            duration_ms,
        })
    }
}
