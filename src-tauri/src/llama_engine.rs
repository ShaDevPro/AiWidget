use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::Window;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;
pub const DEFAULT_LLAMA_PORT: u16 = 11435;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LlamaEngineStatus {
    pub running: bool,
    pub port: u16,
    pub current_model: Option<String>,
    pub binary_installed: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

pub struct LlamaEngine {
    process: Arc<Mutex<Option<Child>>>,
    current_model: Arc<Mutex<Option<String>>>,
    port: u16,
}

impl Default for LlamaEngine {
    fn default() -> Self {
        Self::new(DEFAULT_LLAMA_PORT)
    }
}

impl LlamaEngine {
    pub fn new(port: u16) -> Self {
        Self {
            process: Arc::new(Mutex::new(None)),
            current_model: Arc::new(Mutex::new(None)),
            port,
        }
    }

    pub fn get_bin_dir() -> PathBuf {
        let dir = dirs::data_local_dir()
            .map(|p| p.join("AIWidget").join("bin").join("llama"))
            .unwrap_or_else(|| PathBuf::from("bin").join("llama"));
        if !dir.exists() {
            let _ = fs::create_dir_all(&dir);
        }
        dir
    }

    pub fn find_llama_server_binary() -> Option<PathBuf> {
        // 1. Check local app data bin directory
        let local_bin = Self::get_bin_dir().join("llama-server.exe");
        if local_bin.exists() {
            return Some(local_bin);
        }

        // 2. Check next to current exe
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                let candidate1 = parent.join("llama-server.exe");
                if candidate1.exists() {
                    return Some(candidate1);
                }
                let candidate2 = parent.join("bin").join("llama").join("llama-server.exe");
                if candidate2.exists() {
                    return Some(candidate2);
                }
                let candidate3 = parent.join("resources").join("bin").join("llama").join("llama-server.exe");
                if candidate3.exists() {
                    return Some(candidate3);
                }
            }
        }

        // 3. Check dev workspace folder
        let dev_path = PathBuf::from("src-tauri").join("bin").join("llama").join("llama-server.exe");
        if dev_path.exists() {
            return Some(dev_path);
        }

        None
    }

    pub async fn ensure_binary_installed(window: Option<&Window>) -> Result<PathBuf, String> {
        if let Some(p) = Self::find_llama_server_binary() {
            return Ok(p);
        }

        // Auto copy from dev/bundle folder if available
        let dev_dir = PathBuf::from("src-tauri").join("bin").join("llama");
        let target_dir = Self::get_bin_dir();

        if dev_dir.exists() {
            if let Ok(entries) = fs::read_dir(&dev_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        if let Some(name) = path.file_name() {
                            let _ = fs::copy(&path, target_dir.join(name));
                        }
                    }
                }
            }
            let target_bin = target_dir.join("llama-server.exe");
            if target_bin.exists() {
                return Ok(target_bin);
            }
        }

        // Fallback: Download precompiled CPU zip from GitHub release
        let download_url = "https://github.com/ggml-org/llama.cpp/releases/download/b10621/llama-b10621-bin-win-cpu-x64.zip";
        let temp_zip = std::env::temp_dir().join("llama-win-cpu-x64.zip");

        if let Some(win) = window {
            let _ = win.emit(
                "llama-engine-status",
                "Téléchargement du moteur d'inférence C++ embarqué...",
            );
        }

        let client = reqwest::Client::new();
        let res = client
            .get(download_url)
            .send()
            .await
            .map_err(|e| format!("Erreur lors du téléchargement du moteur C++ : {}", e))?;

        let bytes = res
            .bytes()
            .await
            .map_err(|e| format!("Erreur de lecture du binaire : {}", e))?;

        let mut file = File::create(&temp_zip).map_err(|e| e.to_string())?;
        file.write_all(&bytes).map_err(|e| e.to_string())?;
        drop(file);

        // Extract zip
        let zip_file = File::open(&temp_zip).map_err(|e| e.to_string())?;
        let mut archive = zip::ZipArchive::new(zip_file).map_err(|e| format!("Erreur décompression zip: {}", e))?;

        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            let outpath = match file.enclosed_name() {
                Some(path) => target_dir.join(path),
                None => continue,
            };

            if (*file.name()).ends_with('/') {
                let _ = fs::create_dir_all(&outpath);
            } else {
                if let Some(p) = outpath.parent() {
                    let _ = fs::create_dir_all(p);
                }
                let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
                std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
            }
        }

        let _ = fs::remove_file(&temp_zip);

        let final_bin = target_dir.join("llama-server.exe");
        if final_bin.exists() {
            Ok(final_bin)
        } else {
            Err("Échec de l'installation du moteur llama-server.exe".into())
        }
    }

    pub fn is_running(&self) -> bool {
        let mut proc_guard = self.process.lock().unwrap();
        if let Some(child) = proc_guard.as_mut() {
            match child.try_wait() {
                Ok(None) => true,
                _ => {
                    *proc_guard = None;
                    false
                }
            }
        } else {
            false
        }
    }

    pub async fn check_health(&self) -> bool {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_millis(800))
            .build()
            .unwrap_or_default();

        let url = format!("http://127.0.0.1:{}/health", self.port);
        match client.get(&url).send().await {
            Ok(res) => res.status().is_success(),
            Err(_) => false,
        }
    }

    pub fn kill_all_orphans() {
        #[cfg(target_os = "windows")]
        {
            let mut cmd = std::process::Command::new("taskkill");
            cmd.args(["/F", "/IM", "llama-server.exe", "/T"]);
            cmd.creation_flags(CREATE_NO_WINDOW);
            let _ = cmd.output();
        }
    }

    pub async fn start(&self, model_path: &Path) -> Result<(), String> {
        if !model_path.exists() {
            return Err(format!("Fichier de modèle introuvable : {:?}", model_path));
        }

        // If running with same model, keep running instantly with zero latency
        let current = self.current_model.lock().unwrap().clone();
        let model_str = model_path.to_string_lossy().to_string();
        if self.is_running() && current.as_deref() == Some(&model_str) {
            return Ok(());
        }

        // Stop any running instance and purge all zombie processes
        self.stop();
        Self::kill_all_orphans();

        let binary_path = Self::ensure_binary_installed(None).await?;

        // Universal Auto-Scaling based on real-time hardware detection
        let hw = crate::hardware_detector::HardwareDetector::detect();

        // 1. GPU Offloading layers:
        let n_gpu_layers = if hw.has_discrete_gpu {
            if hw.gpu_vram_gb >= 6.0 {
                "99" // Full GPU offload (blazing 80-120+ tokens/s)
            } else if hw.gpu_vram_gb >= 3.5 {
                "35" // Partial GPU offload (balanced VRAM)
            } else {
                "20"
            }
        } else {
            "0" // Pure CPU AVX2 / AVX-512 acceleration
        };

        // 2. CPU Threads (scale to physical cores, up to 16)
        let num_threads = hw.cpu_cores.max(2).min(16);
        let num_threads_batch = hw.cpu_cores.max(2).min(16);

        // 3. Context Window & Batching:
        let ctx_size = crate::hardware_detector::HardwareDetector::recommended_ctx_size_str(&hw);
        let (batch_size, ubatch_size) = if ctx_size == "4096" {
            ("1024", "512")
        } else {
            ("512", "512")
        };

        let mut cmd = Command::new(&binary_path);
        cmd.arg("-m")
            .arg(model_path)
            .arg("--port")
            .arg(self.port.to_string())
            .arg("--host")
            .arg("127.0.0.1")
            .arg("-c")
            .arg(ctx_size)
            .arg("-b")
            .arg(batch_size)
            .arg("-ub")
            .arg(ubatch_size)
            .arg("-t")
            .arg(num_threads.to_string())
            .arg("-tb")
            .arg(num_threads_batch.to_string())
            .arg("-np")
            .arg("1")
            .arg("-cb")
            .arg("--n-gpu-layers")
            .arg(n_gpu_layers);

        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        let child = cmd
            .spawn()
            .map_err(|e| format!("Impossible de démarrer le moteur llama-server ({:?}): {}", binary_path, e))?;

        *self.process.lock().unwrap() = Some(child);
        *self.current_model.lock().unwrap() = Some(model_str);

        // Poll health until server is ready (up to 15 seconds)
        let start = Instant::now();
        while start.elapsed().as_secs() < 15 {
            if self.check_health().await {
                return Ok(());
            }
            tokio::time::sleep(Duration::from_millis(200)).await;
        }

        // If timeout, check if process died
        if !self.is_running() {
            return Err("Le moteur llama-server s'est arrêté de manière inattendue.".into());
        }

        Ok(())
    }

    pub fn stop(&self) {
        let mut proc_guard = self.process.lock().unwrap();
        if let Some(mut child) = proc_guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        *self.current_model.lock().unwrap() = None;
        Self::kill_all_orphans();
    }

    pub fn get_status(&self) -> LlamaEngineStatus {
        let running = self.is_running();
        let current_model = self.current_model.lock().unwrap().clone();
        let binary_installed = Self::find_llama_server_binary().is_some();

        LlamaEngineStatus {
            running,
            port: self.port,
            current_model,
            binary_installed,
        }
    }

    pub async fn chat_stream(
        &self,
        messages: Vec<ChatMessage>,
        temperature: f32,
        max_tokens: u32,
        window: Window,
        cancel: crate::generation_controller::GenerationController,
    ) -> Result<String, String> {
        let url = format!("http://127.0.0.1:{}/v1/chat/completions", self.port);

        let hw = crate::hardware_detector::HardwareDetector::detect();
        let num_ctx = crate::hardware_detector::HardwareDetector::recommended_num_ctx(&hw);
        let capped_max_tokens = max_tokens
            .min(num_ctx.saturating_sub(512) / 2)
            .clamp(128, 4096);

        let body = serde_json::json!({
            "messages": messages,
            "stream": true,
            "temperature": temperature,
            "max_tokens": capped_max_tokens,
            "cache_prompt": true,
            "top_k": 40,
            "top_p": 0.9,
            "repeat_penalty": 1.1,
        });

        let client = reqwest::Client::builder()
            .tcp_nodelay(true)
            .build()
            .unwrap_or_default();

        let res = client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Erreur de communication avec le moteur local : {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let text = res.text().await.unwrap_or_default();
            return Err(format!("Erreur du moteur (HTTP {}): {}", status, text));
        }

        let mut stream = res.bytes_stream();
        use futures_util::StreamExt;

        let mut full_response = String::new();
        let mut buffer = String::new();
        let mut token_batcher = crate::token_emitter::ChatTokenBatcher::new(window.clone());

        while let Some(chunk_res) = stream.next().await {
            if cancel.is_cancelled() {
                drop(stream);
                token_batcher.flush_cancelled();
                return Err(crate::generation_controller::ERR_GENERATION_CANCELLED.to_string());
            }

            let chunk = chunk_res.map_err(|e| format!("Erreur stream : {}", e))?;
            let text = String::from_utf8_lossy(&chunk);
            buffer.push_str(&text);

            while let Some(pos) = buffer.find('\n') {
                let line: String = buffer.drain(..=pos).collect();
                let trimmed = line.trim();

                if trimmed.starts_with("data: ") {
                    let data_payload = &trimmed[6..];
                    if data_payload == "[DONE]" {
                        token_batcher.push("", true);
                        break;
                    }

                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(data_payload) {
                        if let Some(delta) = val["choices"][0]["delta"]["content"].as_str() {
                            if !delta.is_empty() {
                                full_response.push_str(delta);
                                token_batcher.push(delta, false);
                            }
                        }
                    }
                }
            }
        }

        token_batcher.push("", true);
        Ok(full_response)
    }
}


fn num_cpus() -> usize {
    std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
}
