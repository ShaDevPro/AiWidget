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
        .timeout(std::time::Duration::from_secs(6))
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
    let temp_dir = std::env::temp_dir();
    let installer_path = temp_dir.join("AI-Widget-Setup-Update.exe");

    let _ = window.emit("app-update-progress", serde_json::json!({
        "status": "downloading",
        "percentage": 0,
        "message": "Connexion au serveur de mise à jour..."
    }));

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Widget/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    use futures_util::StreamExt;
    let resp = client.get(&download_url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("Erreur lors du téléchargement de la mise à jour : HTTP {}", resp.status()));
    }

    let total = resp.content_length().unwrap_or(9_000_000);
    let mut stream = resp.bytes_stream();
    let mut downloaded: u64 = 0;
    let mut file = File::create(&installer_path).map_err(|e| e.to_string())?;
    let mut last_emit = Instant::now();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        file.write_all(&chunk).map_err(|e| e.to_string())?;

        if last_emit.elapsed().as_millis() > 200 {
            let pct = ((downloaded as f64 / total as f64) * 100.0) as f32;
            let _ = window.emit("app-update-progress", serde_json::json!({
                "status": "downloading",
                "percentage": pct.min(99.0),
                "downloaded": downloaded,
                "total": total,
                "message": format!("Téléchargement de la mise à jour : {:.0}%", pct)
            }));
            last_emit = Instant::now();
        }
    }

    let _ = window.emit("app-update-progress", serde_json::json!({
        "status": "installing",
        "percentage": 100,
        "message": "Lancement de l'installateur et redémarrage..."
    }));

    // Launch the new installer
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let mut cmd = std::process::Command::new(&installer_path);
        // Exécuter l'installateur sans bloquer
        let _ = cmd.spawn();
        // Fermer immédiatement l'ancienne instance d'AI Widget
        std::thread::sleep(std::time::Duration::from_millis(500));
        std::process::exit(0);
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = std::process::Command::new(&installer_path).spawn();
        std::process::exit(0);
    }
}
