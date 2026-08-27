use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use std::path::PathBuf;
use chrono::Utc;

const INTEGRITY_ENDPOINT: &str = "https://raw.githubusercontent.com/ShaDevPro/AiWidget/main/release/integrity.json";
const CURRENT_VERSION: &str = "1.0.1";
const GRACE_PERIOD_DAYS: i64 = 14;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrityStatus {
    pub is_genuine: bool,
    pub status_code: String,
    pub message: String,
    pub last_verified_at: Option<String>,
    pub binary_sha256: String,
    pub channel: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RemoteIntegrityManifest {
    pub app_name: Option<String>,
    pub min_supported_version: Option<String>,
    pub revoked_licenses: Option<Vec<String>>,
    pub compromised_versions: Option<Vec<String>>,
    pub notice: Option<String>,
}

pub struct IntegrityVerifier;

impl IntegrityVerifier {
    pub fn get_binary_hash() -> String {
        if let Ok(exe_path) = std::env::current_exe() {
            if let Ok(mut file) = File::open(&exe_path) {
                let mut hasher = Sha256::new();
                let mut buffer = [0u8; 8192];
                while let Ok(n) = file.read(&mut buffer) {
                    if n == 0 {
                        break;
                    }
                    hasher.update(&buffer[..n]);
                }
                return hex::encode(hasher.finalize());
            }
        }
        "0000000000000000000000000000000000000000000000000000000000000000".to_string()
    }

    pub async fn verify(active_license_key: Option<String>) -> IntegrityStatus {
        let binary_hash = Self::get_binary_hash();
        let cache_file = Self::get_cache_path();

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(4))
            .build()
            .unwrap_or_default();

        match client.get(INTEGRITY_ENDPOINT).send().await {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(manifest) = resp.json::<RemoteIntegrityManifest>().await {
                    // 1. Check revoked licenses
                    if let (Some(revoked), Some(lic)) = (&manifest.revoked_licenses, &active_license_key) {
                        let normalized = lic.trim().to_uppercase();
                        if revoked.iter().any(|r| r.trim().to_uppercase() == normalized) {
                            return IntegrityStatus {
                                is_genuine: false,
                                status_code: "LICENSE_REVOKED".to_string(),
                                message: "Cette clé de licence a été révoquée par l'éditeur.".to_string(),
                                last_verified_at: Some(Utc::now().to_rfc3339()),
                                binary_sha256: binary_hash,
                                channel: "Official GitHub".to_string(),
                            };
                        }
                    }

                    // 2. Check compromised versions
                    if let Some(compromised) = &manifest.compromised_versions {
                        if compromised.iter().any(|v| v == CURRENT_VERSION) {
                            return IntegrityStatus {
                                is_genuine: false,
                                status_code: "VERSION_COMPROMISED".to_string(),
                                message: "Cette version est obsolète ou compromise. Mise à jour requise.".to_string(),
                                last_verified_at: Some(Utc::now().to_rfc3339()),
                                binary_sha256: binary_hash,
                                channel: "Official GitHub".to_string(),
                            };
                        }
                    }

                    // Save verified cache
                    let now_str = Utc::now().to_rfc3339();
                    let _ = std::fs::create_dir_all(cache_file.parent().unwrap());
                    let _ = std::fs::write(&cache_file, &now_str);

                    return IntegrityStatus {
                        is_genuine: true,
                        status_code: "GENUINE_VERIFIED".to_string(),
                        message: manifest.notice.unwrap_or_else(|| "Logiciel Original Certifié ✓".to_string()),
                        last_verified_at: Some(now_str),
                        binary_sha256: binary_hash,
                        channel: "Official GitHub".to_string(),
                    };
                }
            }
            _ => {
                // Offline fallback - Check cache
                if let Ok(cached_time_str) = std::fs::read_to_string(&cache_file) {
                    if let Ok(last_dt) = chrono::DateTime::parse_from_rfc3339(cached_time_str.trim()) {
                        let days_ago = Utc::now().signed_duration_since(last_dt.with_timezone(&Utc)).num_days();
                        if days_ago <= GRACE_PERIOD_DAYS {
                            return IntegrityStatus {
                                is_genuine: true,
                                status_code: "OFFLINE_VALID".to_string(),
                                message: format!("Authentifié hors-ligne (Vérifié il y a {} j)", days_ago),
                                last_verified_at: Some(cached_time_str.trim().to_string()),
                                binary_sha256: binary_hash,
                                channel: "Cached Verification".to_string(),
                            };
                        }
                    }
                }
            }
        }

        // Default valid for standard execution if network unreachable
        IntegrityStatus {
            is_genuine: true,
            status_code: "STANDALONE_VALID".to_string(),
            message: "Version Standalone Locale Active ✓".to_string(),
            last_verified_at: None,
            binary_sha256: binary_hash,
            channel: "Local".to_string(),
        }
    }

    fn get_cache_path() -> PathBuf {
        dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("aiwidget")
            .join(".integrity_cache")
    }
}
