use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Write;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tauri::Window;

const CURRENT_VERSION: &str = "1.1.0";

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RemoteVersionManifest {
    pub latest_version: String,
    #[serde(default)]
    pub min_required_version: String,
    #[serde(default)]
    pub mandatory: bool,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub changelog: Option<String>,
    #[serde(default)]
    pub download_url: Option<String>,
    #[serde(default)]
    pub published_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct VersionCheckResponse {
    pub update_available: bool,
    pub is_mandatory: bool,
    pub current_version: String,
    pub latest_version: String,
    pub min_required_version: String,
    pub title: String,
    pub changelog: String,
    pub download_url: String,
}

fn parse_semver(v: &str) -> (u32, u32, u32) {
    let clean = v.trim().trim_start_matches('v').trim_start_matches('V');
    let parts: Vec<&str> = clean.split('.').collect();
    let major = parts.get(0).and_then(|s| s.parse().ok()).unwrap_or(0);
    let minor = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0);
    let patch = parts.get(2).and_then(|s| s.split('-').next()?.parse().ok()).unwrap_or(0);
    (major, minor, patch)
}

fn is_version_older(current: &str, target: &str) -> bool {
    let curr = parse_semver(current);
    let tgt = parse_semver(target);
    curr < tgt
}

#[tauri::command]
pub async fn check_app_version() -> Result<VersionCheckResponse, String> {
    let urls = [
        "https://raw.githubusercontent.com/ShaDevPro/AiWidget-Site/main/version.json",
        "https://raw.githubusercontent.com/ShaDevPro/AiWidget/main/version.json",
    ];

    let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(20))
        .timeout(std::time::Duration::from_secs(30))
        .user_agent("AI-Widget-AutoUpdater/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let mut manifest: Option<RemoteVersionManifest> = None;

    for base_url in &urls {
        let cache_buster_url = format!("{}?_t={}", base_url, ts);
        if let Ok(resp) = client.get(&cache_buster_url).send().await {
            if resp.status().is_success() {
                if let Ok(parsed) = resp.json::<RemoteVersionManifest>().await {
                    manifest = Some(parsed);
                    break;
                }
            }
        }
    }

    let manifest = manifest.ok_or_else(|| "Impossible de vérifier les mises à jour (serveur inaccessible)".to_string())?;

    let min_req = if manifest.min_required_version.is_empty() {
        manifest.latest_version.clone()
    } else {
        manifest.min_required_version.clone()
    };

    let is_below_min = is_version_older(CURRENT_VERSION, &min_req);
    let is_below_latest = is_version_older(CURRENT_VERSION, &manifest.latest_version);

    let is_mandatory = is_below_min || (manifest.mandatory && is_below_latest);
    let update_available = is_below_latest || is_below_min;

    let default_url = format!(
        "https://github.com/ShaDevPro/AiWidget-Site/releases/download/v{}/AI-Widget-Setup.exe",
        manifest.latest_version
    );

    Ok(VersionCheckResponse {
        update_available,
        is_mandatory,
        current_version: CURRENT_VERSION.to_string(),
        latest_version: manifest.latest_version,
        min_required_version: min_req,
        title: manifest.title.unwrap_or_else(|| "Mise à jour obligatoire requise".to_string()),
        changelog: manifest.changelog.unwrap_or_else(|| "Une nouvelle version de sécurité est disponible.".to_string()),
        download_url: manifest.download_url.unwrap_or(default_url),
    })
}

#[tauri::command]
pub async fn install_app_update(download_url: String, window: Window) -> Result<(), String> {
    use std::fs::OpenOptions;
    use futures_util::StreamExt;

    let temp_dir = std::env::temp_dir();
    let part_path = temp_dir.join("AI-Widget-Setup-Update.part");
    let installer_path = temp_dir.join("AI-Widget-Setup-Update.exe");

    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(45))
        .timeout(std::time::Duration::from_secs(1800)) // 30 minutes
        .tcp_keepalive(std::time::Duration::from_secs(15))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Widget/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    // 1. Détecter les octets déjà téléchargés pour la reprise
    let mut downloaded: u64 = if part_path.exists() {
        std::fs::metadata(&part_path).map(|m| m.len()).unwrap_or(0)
    } else {
        0
    };

    let mut total_size: u64 = 0;
    let mut attempts = 0;
    const MAX_ATTEMPTS: u32 = 6;

    let _ = window.emit("app-update-progress", serde_json::json!({
        "status": "downloading",
        "percentage": 0,
        "message": if downloaded > 0 {
            format!("Reprise du téléchargement à {:.1} Mo...", downloaded as f64 / 1_048_576.0)
        } else {
            "Connexion au serveur de mise à jour...".to_string()
        }
    }));

    while attempts < MAX_ATTEMPTS {
        attempts += 1;

        let mut req = client.get(&download_url);
        if downloaded > 0 {
            req = req.header("Range", format!("bytes={}-", downloaded));
        }

        let resp = match req.send().await {
            Ok(r) => r,
            Err(e) => {
                if attempts >= MAX_ATTEMPTS {
                    return Err(format!("Échec de connexion après {} tentatives : {}", attempts, e));
                }
                let _ = window.emit("app-update-progress", serde_json::json!({
                    "status": "downloading",
                    "percentage": if total_size > 0 { ((downloaded as f64 / total_size as f64) * 100.0) as f32 } else { 0.0 },
                    "message": format!("Reprise de la connexion (tentative {}/{})...", attempts, MAX_ATTEMPTS)
                }));
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                continue;
            }
        };

        let status = resp.status();
        let is_partial = status == reqwest::StatusCode::PARTIAL_CONTENT;
        let is_ok = status == reqwest::StatusCode::OK;

        if !is_partial && !is_ok {
            return Err(format!("Erreur lors du téléchargement de la mise à jour : HTTP {}", status));
        }

        if is_ok {
            // Le serveur ne supporte pas Range ou nouveau téléchargement
            downloaded = 0;
            total_size = resp.content_length().unwrap_or(9_000_000);
        } else if is_partial {
            let remaining = resp.content_length().unwrap_or(0);
            total_size = downloaded + remaining;
        }

        let mut file = OpenOptions::new()
            .create(true)
            .write(true)
            .append(downloaded > 0)
            .truncate(downloaded == 0)
            .open(&part_path)
            .map_err(|e| e.to_string())?;

        let mut stream = resp.bytes_stream();
        let mut last_emit = Instant::now();
        let mut stream_error = false;

        while let Some(chunk_res) = stream.next().await {
            match chunk_res {
                Ok(chunk) => {
                    downloaded += chunk.len() as u64;
                    if let Err(e) = file.write_all(&chunk) {
                        return Err(format!("Erreur d'écriture disque : {}", e));
                    }

                    if last_emit.elapsed().as_millis() > 200 {
                        let pct = if total_size > 0 {
                            ((downloaded as f64 / total_size as f64) * 100.0) as f32
                        } else {
                            50.0
                        };
                        let _ = window.emit("app-update-progress", serde_json::json!({
                            "status": "downloading",
                            "percentage": pct.min(99.0),
                            "downloaded": downloaded,
                            "total": total_size,
                            "message": format!("Téléchargement de la mise à jour : {:.0}%", pct)
                        }));
                        last_emit = Instant::now();
                    }
                }
                Err(e) => {
                    stream_error = true;
                    eprintln!("Update stream glitch at {} bytes: {}", downloaded, e);
                    break;
                }
            }
        }

        let _ = file.flush();
        drop(file);

        if stream_error {
            if attempts < MAX_ATTEMPTS {
                let _ = window.emit("app-update-progress", serde_json::json!({
                    "status": "downloading",
                    "percentage": if total_size > 0 { ((downloaded as f64 / total_size as f64) * 100.0) as f32 } else { 0.0 },
                    "message": format!("Connexion instable, reprise automatique ({:.1} Mo téléchargés)...", downloaded as f64 / 1_048_576.0)
                }));
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                continue;
            } else {
                return Err("Le téléchargement a été interrompu trop de fois. Veuillez réessayer.".to_string());
            }
        }

        // Si tout le fichier a été téléchargé avec succès
        if total_size > 0 && downloaded >= total_size {
            break;
        }
    }

    // Renommer le .part en .exe final
    if installer_path.exists() {
        let _ = std::fs::remove_file(&installer_path);
    }
    std::fs::rename(&part_path, &installer_path).map_err(|e| format!("Erreur finalisation fichier : {}", e))?;

    let _ = window.emit("app-update-progress", serde_json::json!({
        "status": "installing",
        "percentage": 100,
        "message": "Lancement de l'installateur et redémarrage..."
    }));

    // Lancer l'installateur de manière totalement détachée
    #[cfg(target_os = "windows")]
    {
        let installer_str = installer_path.to_string_lossy().to_string();
        let _ = std::process::Command::new("cmd")
            .args(["/c", "start", "", &installer_str])
            .spawn();

        std::thread::sleep(std::time::Duration::from_millis(1000));
        std::process::exit(0);
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = std::process::Command::new(&installer_path).spawn();
        std::process::exit(0);
    }
}
