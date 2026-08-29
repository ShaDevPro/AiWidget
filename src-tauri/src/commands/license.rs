use tauri::command;
use crate::license_engine::{LicenseEngine, LicenseStatus};

#[command]
pub fn get_hardware_id() -> String {
    LicenseEngine::get_hardware_id()
}

#[command]
pub fn get_license_status() -> LicenseStatus {
    LicenseEngine::get_status()
}

#[command]
pub fn activate_license_key(key: String, company: Option<String>) -> Result<LicenseStatus, String> {
    LicenseEngine::activate(&key, company)
}

#[command]
pub fn deactivate_license() -> Result<(), String> {
    LicenseEngine::deactivate()
}

#[command]
pub fn generate_license_key_admin(tier: String, hwid: String) -> Result<String, String> {
    LicenseEngine::generate_signed_key(&tier, &hwid)
}

#[derive(serde::Serialize)]
pub struct SignedRequestHeaders {
    pub timestamp: i64,
    pub hwid: String,
    pub signature: String,
}

#[command]
pub fn sign_enterprise_request(route: String) -> Result<SignedRequestHeaders, String> {
    let timestamp = chrono::Utc::now().timestamp();
    let hwid = LicenseEngine::get_hardware_id();
    let signature = crate::security_engine::SecurityEngine::sign_request(&route, timestamp, &hwid)?;
    Ok(SignedRequestHeaders {
        timestamp,
        hwid,
        signature,
    })
}

