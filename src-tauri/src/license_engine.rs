use crate::security_engine::SecurityEngine;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseStatus {
    pub is_licensed: bool,
    pub tier: String, // "free" | "lite" | "pro"
    pub hwid: String,
    pub license_key: Option<String>,
    pub activated_at: Option<String>,
    pub is_lite_unlocked: bool,
    pub is_pro_unlocked: bool,
    pub company: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredLicense {
    pub key: String,
    pub tier: String,
    pub hwid: String,
    pub activated_at: String,
    pub company: Option<String>,
    pub vault_signature: String,
}

pub struct LicenseEngine;

impl LicenseEngine {
    /// Computes the unique multi-source hardware fingerprint (HWID)
    pub fn get_hardware_id() -> String {
        SecurityEngine::get_composite_hwid()
    }

    /// Path to the local license vault file
    fn get_vault_path() -> PathBuf {
        dirs::data_local_dir()
            .map(|p| p.join("aiwidget").join("license_vault.dat"))
            .unwrap_or_else(|| PathBuf::from("license_vault.dat"))
    }

    /// Validates a license key with Anti-Brute-Force Rate Limiting & Anti-Debugging
    pub fn validate_key(key: &str) -> Result<(String, String), String> {
        // Enforce Anti-Brute-Force & Rate Limiting Check
        SecurityEngine::check_rate_limit("Activation de Licence")?;

        let clean_key = key.trim().to_uppercase();
        let parts: Vec<&str> = clean_key.split('-').collect();

        // Format: WAI-[LITE|PRO]-[HWID1]-[HWID2]-[HWID3]-[HWID4]-[SIG]
        if parts.len() < 7 || parts[0] != "WAI" {
            SecurityEngine::record_failure();
            return Err("Format de clé de licence invalide. Format attendu : WAI-LITE-XXXX-... ou WAI-PRO-XXXX-...".to_string());
        }

        let tier = match parts[1] {
            "LITE" => "lite".to_string(),
            "PRO" => "pro".to_string(),
            _ => {
                SecurityEngine::record_failure();
                return Err("Type de licence inconnu dans la clé.".to_string());
            }
        };

        let key_hwid = format!("{}-{}-{}-{}", parts[2], parts[3], parts[4], parts[5]);
        let current_hwid = Self::get_hardware_id();

        // Verify HWID match (or universal wildcard)
        if key_hwid != current_hwid && key_hwid != "UNIV-UNIV-UNIV-UNIV" {
            SecurityEngine::record_failure();
            return Err(format!(
                "Cette clé de licence est scellée pour une autre machine (ID: {}). Votre ID Machine actuel est {}.",
                key_hwid, current_hwid
            ));
        }

        let provided_sig = parts[6];

        // Compute HMAC signature via Security Engine
        let payload = format!("{}:{}:LIFETIME", parts[1], key_hwid);
        let expected_sig = SecurityEngine::compute_hmac(&payload)?;

        // Compare first 12 characters of HMAC signature
        let sig_prefix = &expected_sig[0..provided_sig.len().min(expected_sig.len())];
        if provided_sig != sig_prefix {
            let failures = SecurityEngine::record_failure();
            return Err(format!(
                "Signature cryptographique invalide ou altérée (Tentative échouée #{}/10).",
                failures
            ));
        }

        // Reset failures on valid key
        SecurityEngine::reset_failures();
        Ok((tier, key_hwid))
    }

    /// Activates a license key with anti-tamper vault sealing
    pub fn activate(key: &str, company: Option<String>) -> Result<LicenseStatus, String> {
        let (tier, hwid) = Self::validate_key(key)?;

        let payload_for_sign = format!("{}:{}:{}", key.trim().to_uppercase(), tier, hwid);
        let vault_signature = SecurityEngine::sign_vault_data(&payload_for_sign);

        let stored = StoredLicense {
            key: key.trim().to_uppercase(),
            tier: tier.clone(),
            hwid: hwid.clone(),
            activated_at: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            company,
            vault_signature,
        };

        let vault_path = Self::get_vault_path();
        if let Some(parent) = vault_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let json = serde_json::to_string_pretty(&stored)
            .map_err(|e| format!("Erreur sérialisation: {}", e))?;
        std::fs::write(&vault_path, json)
            .map_err(|e| format!("Impossible d'enregistrer le coffre de licence: {}", e))?;

        Ok(Self::get_status())
    }

    /// Retrieves current license status with integrity verification
    pub fn get_status() -> LicenseStatus {
        let hwid = Self::get_hardware_id();
        let vault_path = Self::get_vault_path();

        if vault_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&vault_path) {
                if let Ok(stored) = serde_json::from_str::<StoredLicense>(&content) {
                    // Check vault integrity seal
                    let payload_check = format!("{}:{}:{}", stored.key, stored.tier, stored.hwid);
                    let expected_vault_sig = SecurityEngine::sign_vault_data(&payload_check);

                    if stored.vault_signature == expected_vault_sig {
                        if let Ok((tier, key_hwid)) = Self::validate_key_silent(&stored.key) {
                            if key_hwid == hwid || key_hwid == "UNIV-UNIV-UNIV-UNIV" {
                                let is_lite = tier == "lite" || tier == "pro";
                                let is_pro = tier == "pro";
                                return LicenseStatus {
                                    is_licensed: true,
                                    tier: tier.clone(),
                                    hwid,
                                    license_key: Some(stored.key),
                                    activated_at: Some(stored.activated_at),
                                    is_lite_unlocked: is_lite,
                                    is_pro_unlocked: is_pro,
                                    company: stored.company,
                                };
                            }
                        }
                    }
                }
            }
        }

        LicenseStatus {
            is_licensed: false,
            tier: "free".to_string(),
            hwid,
            license_key: None,
            activated_at: None,
            is_lite_unlocked: true,
            is_pro_unlocked: false,
            company: None,
        }
    }

    /// Silent validation for startup integrity checks (does not enforce interactive rate limit)
    fn validate_key_silent(key: &str) -> Result<(String, String), String> {
        let clean_key = key.trim().to_uppercase();
        let parts: Vec<&str> = clean_key.split('-').collect();

        if parts.len() < 7 || parts[0] != "WAI" {
            return Err("Format invalide".to_string());
        }

        let tier = match parts[1] {
            "LITE" => "lite".to_string(),
            "PRO" => "pro".to_string(),
            _ => return Err("Tier invalide".to_string()),
        };

        let key_hwid = format!("{}-{}-{}-{}", parts[2], parts[3], parts[4], parts[5]);
        let provided_sig = parts[6];

        let payload = format!("{}:{}:LIFETIME", parts[1], key_hwid);
        let expected_sig = SecurityEngine::compute_hmac(&payload)?;
        let sig_prefix = &expected_sig[0..provided_sig.len().min(expected_sig.len())];

        if provided_sig != sig_prefix {
            return Err("Signature invalide".to_string());
        }

        Ok((tier, key_hwid))
    }

    /// Deactivates / removes local license
    pub fn deactivate() -> Result<(), String> {
        let vault_path = Self::get_vault_path();
        if vault_path.exists() {
            std::fs::remove_file(vault_path).map_err(|e| format!("Erreur suppression licence: {}", e))?;
        }
        Ok(())
    }

    /// Generator utility (Used to sign keys)
    pub fn generate_signed_key(tier: &str, target_hwid: &str) -> Result<String, String> {
        let tier_upper = tier.trim().to_uppercase();
        let clean_hwid = target_hwid.trim().to_uppercase();

        let payload = format!("{}:{}:LIFETIME", tier_upper, clean_hwid);
        let sig_full = SecurityEngine::compute_hmac(&payload)?;
        let sig_12 = &sig_full[0..12];

        Ok(format!("WAI-{}-{}-{}", tier_upper, clean_hwid, sig_12))
    }
}
