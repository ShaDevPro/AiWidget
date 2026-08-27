use serde::{Deserialize, Serialize};
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::Instant;
use tauri::Window;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CuratedGGUFModel {
    pub id: String,
    pub name: String,
    pub filename: String,
    pub size_mb: u64,
    pub ram_needed: String,
    pub url: String,
    pub description_key: String,
    pub tag: String,
    pub is_recommended: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InstalledGGUFModel {
    pub id: String,
    pub name: String,
    pub filename: String,
    pub file_path: String,
    pub size_bytes: u64,
    pub size_formatted: String,
    pub is_curated: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PartialGGUFDownload {
    pub model_id: String,
    pub filename: String,
    pub partial_bytes: u64,
    pub total_bytes: u64,
    pub percentage: u8,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GGUFDownloadProgress {
    pub model_id: String,
    pub completed_bytes: u64,
    pub total_bytes: u64,
    pub percentage: u8,
    pub speed_mbps: f64,
    /// i18n key: starting | resuming | downloading | complete
    pub status: String,
    pub resuming: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct DownloadMeta {
    total_bytes: u64,
    url: String,
}

pub struct GGUFManager;

const HF_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AI-Widget/1.0";

impl GGUFManager {
    fn build_download_client() -> Result<reqwest::Client, String> {
        reqwest::Client::builder()
            .user_agent(HF_USER_AGENT)
            .redirect(reqwest::redirect::Policy::limited(10))
            .build()
            .map_err(|e| e.to_string())
    }

    /// Resolve a user-facing model name (catalog id, filename, or Ollama alias) to a catalog id.
    pub fn resolve_model_id(model: &str) -> Option<String> {
        let model = model.trim();
        if model.is_empty() {
            return None;
        }

        let catalog = Self::get_curated_catalog();
        if let Some(c) = catalog.iter().find(|m| {
            m.id.eq_ignore_ascii_case(model) || m.filename.eq_ignore_ascii_case(model)
        }) {
            return Some(c.id.clone());
        }

        let key = model.to_lowercase();
        let aliases: &[(&str, &str)] = &[
            ("phi3.5:3.8b", "phi-3.5:mini"),
            ("phi-3.5:3.8b", "phi-3.5:mini"),
            ("phi3.5", "phi-3.5:mini"),
            ("phi-3.5-mini", "phi-3.5:mini"),
        ];
        for (alias, id) in aliases {
            if key == *alias {
                return Some(id.to_string());
            }
        }

        None
    }
    pub fn get_models_dir() -> PathBuf {
        let dir = dirs::data_local_dir()
            .map(|p| p.join("AIWidget").join("models"))
            .unwrap_or_else(|| PathBuf::from("models"));
        if !dir.exists() {
            let _ = fs::create_dir_all(&dir);
        }
        dir
    }

    pub fn get_curated_catalog() -> Vec<CuratedGGUFModel> {
        vec![
            CuratedGGUFModel {
                id: "qwen2.5:3b".into(),
                name: "Qwen 2.5 3B Instruct".into(),
                filename: "qwen2.5-3b-instruct-q4_k_m.gguf".into(),
                size_mb: 2007,
                ram_needed: "~2.8 Go".into(),
                url: "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf".into(),
                description_key: "gguf.qwen3bDesc".into(),
                tag: "🌟 Recommandé (i3 / 8 Go)".into(),
                is_recommended: true,
            },
            CuratedGGUFModel {
                id: "qwen2.5:1.5b".into(),
                name: "Qwen 2.5 1.5B Instruct".into(),
                filename: "qwen2.5-1.5b-instruct-q4_k_m.gguf".into(),
                size_mb: 1065,
                ram_needed: "~1.5 Go".into(),
                url: "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf".into(),
                description_key: "gguf.qwen15Desc".into(),
                tag: "FR / EN / AR Ultra-Fluide".into(),
                is_recommended: false,
            },
            CuratedGGUFModel {
                id: "mistral:7b".into(),
                name: "Mistral 7B Instruct v0.3".into(),
                filename: "Mistral-7B-Instruct-v0.3.Q4_K_M.gguf".into(),
                size_mb: 4170,
                ram_needed: "~5.2 Go".into(),
                url: "https://huggingface.co/MaziyarPanahi/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3.Q4_K_M.gguf".into(),
                description_key: "gguf.mistralDesc".into(),
                tag: "🇫🇷 Modèle Français Élite".into(),
                is_recommended: false,
            },
            CuratedGGUFModel {
                id: "phi-3.5:mini".into(),
                name: "Phi-3.5 Mini 3.8B".into(),
                filename: "Phi-3.5-mini-instruct.Q4_K_M.gguf".into(),
                size_mb: 2282,
                ram_needed: "~3.2 Go".into(),
                url: "https://huggingface.co/QuantFactory/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct.Q4_K_M.gguf".into(),
                description_key: "gguf.phi35Desc".into(),
                tag: "🔬 Microsoft Research".into(),
                is_recommended: false,
            },
            CuratedGGUFModel {
                id: "gemma2:2b".into(),
                name: "Gemma 2 2B Instruct".into(),
                filename: "gemma-2-2b-it-Q4_K_M.gguf".into(),
                size_mb: 1630,
                ram_needed: "~2.4 Go".into(),
                url: "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf".into(),
                description_key: "gguf.gemma2Desc".into(),
                tag: "🔷 Google DeepMind".into(),
                is_recommended: false,
            },
            CuratedGGUFModel {
                id: "llama3.2:3b".into(),
                name: "Llama 3.2 3B Instruct".into(),
                filename: "Llama-3.2-3B-Instruct-Q4_K_M.gguf".into(),
                size_mb: 1925,
                ram_needed: "~2.8 Go".into(),
                url: "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf".into(),
                description_key: "gguf.llama3bDesc".into(),
                tag: "🦙 Meta AI Haute Qualité".into(),
                is_recommended: false,
            },
            CuratedGGUFModel {
                id: "deepseek-r1:1.5b".into(),
                name: "DeepSeek-R1 Distill 1.5B".into(),
                filename: "DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf".into(),
                size_mb: 1065,
                ram_needed: "~1.6 Go".into(),
                url: "https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-1.5B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf".into(),
                description_key: "gguf.deepseekDesc".into(),
                tag: "🧠 Raisonnement Pas à Pas".into(),
                is_recommended: false,
            },
            CuratedGGUFModel {
                id: "deepseek-r1:7b".into(),
                name: "DeepSeek-R1 Distill 7B".into(),
                filename: "DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf".into(),
                size_mb: 4466,
                ram_needed: "~5.5 Go".into(),
                url: "https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-7B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf".into(),
                description_key: "gguf.deepseek7bDesc".into(),
                tag: "🧠 Raisonnement Expert".into(),
                is_recommended: false,
            },
            CuratedGGUFModel {
                id: "llama3.2:1b".into(),
                name: "Llama 3.2 1B Instruct".into(),
                filename: "Llama-3.2-1B-Instruct-Q4_K_M.gguf".into(),
                size_mb: 770,
                ram_needed: "~1.3 Go".into(),
                url: "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf".into(),
                description_key: "gguf.llama1bDesc".into(),
                tag: "Ultra Rapide".into(),
                is_recommended: false,
            },
            CuratedGGUFModel {
                id: "smollm2:1.7b".into(),
                name: "SmolLM2 1.7B Instruct".into(),
                filename: "smollm2-1.7b-instruct-q4_k_m.gguf".into(),
                size_mb: 1006,
                ram_needed: "~1.6 Go".into(),
                url: "https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF/resolve/main/smollm2-1.7b-instruct-q4_k_m.gguf".into(),
                description_key: "gguf.smollmDesc".into(),
                tag: "HuggingFace Assistant".into(),
                is_recommended: false,
            },
            CuratedGGUFModel {
                id: "qwen2.5:0.5b".into(),
                name: "Qwen 2.5 0.5B Instruct".into(),
                filename: "qwen2.5-0.5b-instruct-q4_k_m.gguf".into(),
                size_mb: 468,
                ram_needed: "~0.8 Go".into(),
                url: "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf".into(),
                description_key: "gguf.qwen05Desc".into(),
                tag: "Ultra-Léger".into(),
                is_recommended: false,
            },
        ]
    }

    pub fn list_installed() -> Vec<InstalledGGUFModel> {
        let dir = Self::get_models_dir();
        let curated = Self::get_curated_catalog();
        let mut list = Vec::new();

        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Some(ext) = path.extension() {
                        if ext.to_string_lossy().to_lowercase() == "gguf" {
                            let filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                            let metadata = fs::metadata(&path).ok();
                            let size_bytes = metadata.map(|m| m.len()).unwrap_or(0);
                            let size_mb = size_bytes as f64 / (1024.0 * 1024.0);
                            let size_formatted = if size_mb >= 1024.0 {
                                format!("{:.2} Go", size_mb / 1024.0)
                            } else {
                                format!("{:.0} Mo", size_mb)
                            };

                            let curated_match = curated.iter().find(|c| c.filename.eq_ignore_ascii_case(&filename));
                            let (id, name, is_curated) = match curated_match {
                                Some(c) => (c.id.clone(), c.name.clone(), true),
                                None => {
                                    let stem = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
                                    (stem.clone(), stem, false)
                                }
                            };

                            list.push(InstalledGGUFModel {
                                id,
                                name,
                                filename,
                                file_path: path.to_string_lossy().to_string(),
                                size_bytes,
                                size_formatted,
                                is_curated,
                            });
                        }
                    }
                }
            }
        }

        list.sort_by(|a, b| a.name.cmp(&b.name));
        list
    }

    pub fn get_model_path(model_identifier: &str) -> Option<PathBuf> {
        let dir = Self::get_models_dir();
        let curated = Self::get_curated_catalog();

        // 1. Direct filename check
        let direct = dir.join(model_identifier);
        if direct.exists() {
            return Some(direct);
        }

        // 2. Direct filename with .gguf check
        let with_ext = dir.join(format!("{}.gguf", model_identifier));
        if with_ext.exists() {
            return Some(with_ext);
        }

        // 3. Curated model ID check (e.g. "qwen2.5:1.5b" or alias "phi3.5:3.8b")
        if let Some(resolved_id) = Self::resolve_model_id(model_identifier) {
            if let Some(c) = curated.iter().find(|c| c.id == resolved_id) {
                let p = dir.join(&c.filename);
                if p.exists() {
                    return Some(p);
                }
            }
        }

        if let Some(c) = curated.iter().find(|c| c.id == model_identifier || c.filename == model_identifier) {
            let p = dir.join(&c.filename);
            if p.exists() {
                return Some(p);
            }
        }

        // 4. Case-insensitive search in models dir
        if let Ok(entries) = fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(fname) = path.file_name() {
                    let fname_str = fname.to_string_lossy();
                    if fname_str.eq_ignore_ascii_case(model_identifier)
                        || fname_str.eq_ignore_ascii_case(&format!("{}.gguf", model_identifier))
                    {
                        return Some(path);
                    }
                }
            }
        }

        None
    }

    fn download_meta_path(temp_path: &Path) -> PathBuf {
        PathBuf::from(format!("{}.meta", temp_path.to_string_lossy()))
    }

    fn load_download_meta(meta_path: &Path) -> Option<DownloadMeta> {
        let data = fs::read_to_string(meta_path).ok()?;
        serde_json::from_str(&data).ok()
    }

    fn save_download_meta(meta_path: &Path, total_bytes: u64, url: &str) -> Result<(), String> {
        let meta = DownloadMeta {
            total_bytes,
            url: url.to_string(),
        };
        let json = serde_json::to_string(&meta).map_err(|e| e.to_string())?;
        fs::write(meta_path, json).map_err(|e| e.to_string())
    }

    fn parse_content_range_total(value: &str) -> Option<u64> {
        let part = value.strip_prefix("bytes ")?;
        let total_part = part.split('/').nth(1)?;
        total_part.parse().ok()
    }

    fn is_complete_file(path: &Path) -> bool {
        fs::metadata(path)
            .ok()
            .map(|m| m.len() > 10 * 1024 * 1024)
            .unwrap_or(false)
    }

    fn emit_download_progress(
        window: &Window,
        model_id: &str,
        completed_bytes: u64,
        total_bytes: u64,
        speed_mbps: f64,
        status_key: &str,
        resuming: bool,
    ) {
        let percentage = if total_bytes > 0 {
            ((completed_bytes as f64 / total_bytes as f64) * 100.0).min(100.0) as u8
        } else {
            0
        };
        let progress = GGUFDownloadProgress {
            model_id: model_id.to_string(),
            completed_bytes,
            total_bytes,
            percentage,
            speed_mbps,
            status: status_key.to_string(),
            resuming,
        };
        let _ = window.emit("gguf-download-progress", progress);
    }

    pub fn list_partial_downloads() -> Vec<PartialGGUFDownload> {
        let dir = Self::get_models_dir();
        let catalog = Self::get_curated_catalog();
        let mut list = Vec::new();

        for model in catalog {
            let target_path = dir.join(&model.filename);
            if Self::is_complete_file(&target_path) {
                continue;
            }

            let temp_path = dir.join(format!("{}.downloading", model.filename));
            if !temp_path.exists() {
                continue;
            }

            let partial_bytes = fs::metadata(&temp_path).map(|m| m.len()).unwrap_or(0);
            if partial_bytes == 0 {
                continue;
            }

            let meta_path = Self::download_meta_path(&temp_path);
            let total_bytes = Self::load_download_meta(&meta_path)
                .map(|m| m.total_bytes)
                .unwrap_or(model.size_mb * 1024 * 1024);
            let percentage = if total_bytes > 0 {
                ((partial_bytes as f64 / total_bytes as f64) * 100.0).min(99.0) as u8
            } else {
                0
            };

            list.push(PartialGGUFDownload {
                model_id: model.id,
                filename: model.filename,
                partial_bytes,
                total_bytes,
                percentage,
            });
        }

        list
    }

    pub async fn download_model(model_id: String, window: Window) -> Result<String, String> {
        let resolved_id = Self::resolve_model_id(&model_id)
            .ok_or_else(|| format!("Modèle GGUF introuvable dans le catalogue : {}", model_id))?;
        let catalog = Self::get_curated_catalog();
        let model = catalog
            .into_iter()
            .find(|m| m.id == resolved_id)
            .ok_or_else(|| format!("Modèle GGUF introuvable dans le catalogue : {}", model_id))?;

        let models_dir = Self::get_models_dir();
        let target_path = models_dir.join(&model.filename);
        let temp_path = models_dir.join(format!("{}.downloading", model.filename));
        let meta_path = Self::download_meta_path(&temp_path);

        if Self::is_complete_file(&target_path) {
            if let Ok(meta) = fs::metadata(&target_path) {
                Self::emit_download_progress(
                    &window,
                    &model.id,
                    meta.len(),
                    meta.len(),
                    0.0,
                    "complete",
                    false,
                );
            }
            let _ = fs::remove_file(&temp_path);
            let _ = fs::remove_file(&meta_path);
            return Ok(model.filename.clone());
        }

        let mut resume_from = if temp_path.exists() {
            fs::metadata(&temp_path).map(|m| m.len()).unwrap_or(0)
        } else {
            0
        };

        let client = Self::build_download_client()?;

        Self::emit_download_progress(
            &window,
            &model.id,
            resume_from,
            model.size_mb * 1024 * 1024,
            0.0,
            if resume_from > 0 { "resuming" } else { "starting" },
            resume_from > 0,
        );

        let mut request = client.get(&model.url);
        if resume_from > 0 {
            request = request.header(reqwest::header::RANGE, format!("bytes={}-", resume_from));
        }

        let res = request
            .send()
            .await
            .map_err(|e| format!("Erreur de connexion à HuggingFace : {}", e))?;

        let status = res.status();
        let mut resuming = resume_from > 0;

        let total_bytes = if status == reqwest::StatusCode::PARTIAL_CONTENT {
            res.headers()
                .get(reqwest::header::CONTENT_RANGE)
                .and_then(|v| v.to_str().ok())
                .and_then(Self::parse_content_range_total)
                .or_else(|| {
                    Self::load_download_meta(&meta_path).map(|m| {
                        if m.url == model.url {
                            m.total_bytes
                        } else {
                            model.size_mb * 1024 * 1024
                        }
                    })
                })
                .unwrap_or(model.size_mb * 1024 * 1024)
        } else if status.is_success() {
            if resume_from > 0 {
                let _ = fs::remove_file(&temp_path);
                let _ = fs::remove_file(&meta_path);
                resume_from = 0;
                resuming = false;
            }
            res.content_length().unwrap_or(model.size_mb * 1024 * 1024)
        } else {
            return Err(format!(
                "Échec du téléchargement (HTTP {}) — lien : {}",
                status,
                model.url
            ));
        };

        Self::save_download_meta(&meta_path, total_bytes, &model.url)?;

        let mut file = if resume_from > 0 && status == reqwest::StatusCode::PARTIAL_CONTENT {
            OpenOptions::new()
                .create(true)
                .append(true)
                .open(&temp_path)
                .map_err(|e| format!("Impossible d'ouvrir le fichier partiel : {}", e))?
        } else {
            resume_from = 0;
            resuming = false;
            File::create(&temp_path).map_err(|e| format!("Impossible de créer le fichier : {}", e))?
        };

        let mut stream = res.bytes_stream();
        use futures_util::StreamExt;

        let mut completed_bytes = resume_from;
        let session_start_bytes = resume_from;
        let start_time = Instant::now();
        let mut last_emit = Instant::now();

        Self::emit_download_progress(
            &window,
            &model.id,
            completed_bytes,
            total_bytes,
            0.0,
            if resuming { "resuming" } else { "downloading" },
            resuming,
        );

        while let Some(chunk_res) = stream.next().await {
            let chunk = chunk_res.map_err(|e| format!("Erreur lors du streaming : {}", e))?;
            file.write_all(&chunk).map_err(|e| e.to_string())?;
            completed_bytes += chunk.len() as u64;

            if last_emit.elapsed().as_millis() > 250 || completed_bytes >= total_bytes {
                let session_bytes = completed_bytes.saturating_sub(session_start_bytes);
                let elapsed_secs = start_time.elapsed().as_secs_f64().max(0.1);
                let speed_mbps = (session_bytes as f64 / ONE_MB_F) / elapsed_secs;

                Self::emit_download_progress(
                    &window,
                    &model.id,
                    completed_bytes,
                    total_bytes,
                    speed_mbps,
                    "downloading",
                    resuming,
                );
                last_emit = Instant::now();
            }
        }

        file.flush().map_err(|e| e.to_string())?;
        drop(file);

        if target_path.exists() {
            let _ = fs::remove_file(&target_path);
        }
        fs::rename(&temp_path, &target_path)
            .map_err(|e| format!("Erreur lors de la finalisation du fichier : {}", e))?;
        let _ = fs::remove_file(&meta_path);

        Self::emit_download_progress(
            &window,
            &model.id,
            total_bytes,
            total_bytes,
            0.0,
            "complete",
            false,
        );

        Ok(target_path.to_string_lossy().to_string())
    }

    pub fn import_local_file(source_path: &str) -> Result<InstalledGGUFModel, String> {
        let src = Path::new(source_path);
        if !src.exists() || !src.is_file() {
            return Err("Le fichier source spécifié n'existe pas.".into());
        }

        let filename = src.file_name().ok_or("Nom de fichier invalide")?.to_string_lossy().to_string();
        if !filename.to_lowercase().ends_with(".gguf") {
            return Err("Le fichier doit avoir l'extension .gguf".into());
        }

        let dest_dir = Self::get_models_dir();
        let dest = dest_dir.join(&filename);

        fs::copy(src, &dest).map_err(|e| format!("Erreur lors de la copie du modèle : {}", e))?;

        let metadata = fs::metadata(&dest).map_err(|e| e.to_string())?;
        let size_bytes = metadata.len();
        let size_mb = size_bytes as f64 / (1024.0 * 1024.0);
        let size_formatted = if size_mb >= 1024.0 {
            format!("{:.2} Go", size_mb / 1024.0)
        } else {
            format!("{:.0} Mo", size_mb)
        };

        let stem = dest.file_stem().unwrap_or_default().to_string_lossy().to_string();

        Ok(InstalledGGUFModel {
            id: stem.clone(),
            name: stem,
            filename,
            file_path: dest.to_string_lossy().to_string(),
            size_bytes,
            size_formatted,
            is_curated: false,
        })
    }

    pub fn delete_model(filename_or_id: &str) -> Result<(), String> {
        let models_dir = Self::get_models_dir();
        let mut deleted = false;

        // 1. Try finding installed model via standard path resolution
        if let Some(path) = Self::get_model_path(filename_or_id) {
            if path.exists() {
                let _ = fs::remove_file(path);
                deleted = true;
            }
        }

        // 2. Also check curated filename or exact name for .gguf, .part and .part.json
        let curated = Self::get_curated_catalog();
        let filename = curated
            .iter()
            .find(|c| c.id.eq_ignore_ascii_case(filename_or_id) || c.name.eq_ignore_ascii_case(filename_or_id) || c.filename.eq_ignore_ascii_case(filename_or_id))
            .map(|c| c.filename.clone())
            .unwrap_or_else(|| filename_or_id.to_string());

        let target_path = models_dir.join(&filename);
        if target_path.exists() {
            let _ = fs::remove_file(&target_path);
            deleted = true;
        }

        let temp_path = models_dir.join(format!("{}.part", filename));
        if temp_path.exists() {
            let _ = fs::remove_file(&temp_path);
            deleted = true;
        }

        let meta_path = models_dir.join(format!("{}.part.json", filename));
        if meta_path.exists() {
            let _ = fs::remove_file(&meta_path);
            deleted = true;
        }

        if deleted {
            Ok(())
        } else {
            Err(format!("Modèle {} introuvable.", filename_or_id))
        }
    }
}

const ONE_MB_F: f64 = 1024.0 * 1024.0;
