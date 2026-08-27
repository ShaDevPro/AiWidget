use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Window;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaStatus {
    pub installed: bool,
    pub running: bool,
    pub path: Option<String>,
}

pub fn get_ollama_path() -> Option<PathBuf> {
    // 1. Check LOCALAPPDATA\Programs\Ollama\ollama.exe (default Windows installer location)
    if let Some(local_app_data) = dirs::data_local_dir() {
        let p = local_app_data.join("Programs").join("Ollama").join("ollama.exe");
        if p.exists() {
            return Some(p);
        }
    }

    // 2. Check Program Files
    if let Ok(prog_files) = std::env::var("ProgramFiles") {
        let p = Path::new(&prog_files).join("Ollama").join("ollama.exe");
        if p.exists() {
            return Some(p);
        }
    }

    // 3. Check PATH
    if let Ok(output) = Command::new("where.exe").arg("ollama").output() {
        if output.status.success() {
            let out_str = String::from_utf8_lossy(&output.stdout);
            if let Some(first_line) = out_str.lines().next() {
                let p = PathBuf::from(first_line.trim());
                if p.exists() {
                    return Some(p);
                }
            }
        }
    }

    None
}

pub async fn check_status(base_url: &str) -> OllamaStatus {
    let path = get_ollama_path();
    let installed = path.is_some();
    
    // Check if HTTP endpoint is responding
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(1200))
        .build()
        .unwrap_or_default();

    let running = match client.get(format!("{}/api/tags", base_url)).send().await {
        Ok(res) => res.status().is_success(),
        Err(_) => false,
    };

    OllamaStatus {
        installed,
        running,
        path: path.map(|p| p.to_string_lossy().to_string()),
    }
}

pub fn start_service() -> Result<(), String> {
    let path = get_ollama_path().ok_or_else(|| "Ollama n'est pas installé sur cet ordinateur.".to_string())?;

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        Command::new(&path)
            .arg("serve")
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Impossible de démarrer Ollama: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new(&path)
            .arg("serve")
            .spawn()
            .map_err(|e| format!("Impossible de démarrer Ollama: {}", e))?;
    }

    Ok(())
}

#[derive(Clone, Serialize)]
struct InstallProgressPayload {
    status: String,
    completed: u64,
    total: u64,
}

pub async fn download_and_install(window: Window) -> Result<(), String> {
    let url = "https://ollama.com/download/OllamaSetup.exe";
    let temp_dir = std::env::temp_dir();
    let installer_path = temp_dir.join("OllamaSetup.exe");

    let _ = window.emit("ollama-install-progress", InstallProgressPayload {
        status: "Connexion au serveur de téléchargement...".into(),
        completed: 0,
        total: 100,
    });

    let client = reqwest::Client::new();
    let res = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Erreur de connexion au serveur Ollama: {}", e))?;

    let total_size = res.content_length().unwrap_or(75_000_000);
    let mut downloaded: u64 = 0;
    let mut stream = res.bytes_stream();

    let mut file = tokio::fs::File::create(&installer_path)
        .await
        .map_err(|e| format!("Impossible de créer le fichier temporaire: {}", e))?;

    use tokio::io::AsyncWriteExt;

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| format!("Erreur lors du téléchargement: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Erreur d'écriture: {}", e))?;

        downloaded += chunk.len() as u64;

        let _ = window.emit("ollama-install-progress", InstallProgressPayload {
            status: "Téléchargement de OllamaSetup.exe en cours...".into(),
            completed: downloaded,
            total: total_size,
        });
    }

    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);

    let _ = window.emit("ollama-install-progress", InstallProgressPayload {
        status: "Lancement de l'installation de Ollama...".into(),
        completed: total_size,
        total: total_size,
    });

    // Run installer
    let status = Command::new(&installer_path)
        .arg("/SILENT")
        .status()
        .or_else(|_| Command::new(&installer_path).status())
        .map_err(|e| format!("Impossible d'exécuter l'installateur: {}", e))?;

    if !status.success() {
        return Err("L'installation a été interrompue ou a échoué.".into());
    }

    // Wait a moment for Ollama service to start or launch it
    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
    let _ = start_service();

    let _ = window.emit("ollama-install-progress", InstallProgressPayload {
        status: "Installation terminée avec succès !".into(),
        completed: total_size,
        total: total_size,
    });

    Ok(())
}
