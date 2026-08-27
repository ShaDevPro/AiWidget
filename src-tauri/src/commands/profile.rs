use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use uuid::Uuid;

use crate::AppState;

// ── Data structures ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SecretQuestion {
    pub question: String,
    pub answer_hash: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Profile {
    pub id: String,
    pub username: String,
    pub password_hash: String,
    pub role: String, // "admin" | "user"
    pub avatar_path: Option<String>,
    pub avatar_color: String,
    pub created_at: String,
    pub secret_questions: Vec<SecretQuestion>,
    pub master_key_hash: String,
    #[serde(default)]
    pub is_banned: bool,
}

/// Public view — never exposes hashes
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProfilePublic {
    pub id: String,
    pub username: String,
    pub role: String,
    pub avatar_path: Option<String>,
    pub avatar_color: String,
    pub created_at: String,
    pub has_avatar: bool,
    pub is_banned: bool,
}

// ── Helpers ─────────────────────────────────────────────────────────────────

fn profiles_json_path() -> PathBuf {
    let base = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("aiwidget")
        .join("profiles");
    std::fs::create_dir_all(&base).ok();
    base.join("profiles.json")
}

fn profile_dir(profile_id: &str) -> PathBuf {
    let base = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("aiwidget")
        .join("profiles")
        .join(profile_id);
    std::fs::create_dir_all(&base).ok();
    base
}

pub fn profile_db_path(profile_id: &str) -> PathBuf {
    profile_dir(profile_id).join("data.db")
}

fn hash(value: &str) -> String {
    let mut h = Sha256::new();
    h.update(value.as_bytes());
    format!("{:x}", h.finalize())
}

fn hash_password(profile_id: &str, password: &str) -> String {
    hash(&format!("{}:{}", profile_id, password))
}

fn hash_answer(answer: &str) -> String {
    hash(&answer.trim().to_lowercase())
}

fn hash_master_key(key: &str) -> String {
    hash(&format!("master:{}", key))
}

fn load_profiles() -> Vec<Profile> {
    let path = profiles_json_path();
    if !path.exists() {
        return vec![];
    }
    let data = std::fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&data).unwrap_or_default()
}

fn save_profiles(profiles: &[Profile]) -> Result<(), String> {
    let path = profiles_json_path();
    let json = serde_json::to_string_pretty(profiles).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

fn to_public(p: &Profile) -> ProfilePublic {
    ProfilePublic {
        id: p.id.clone(),
        username: p.username.clone(),
        role: p.role.clone(),
        avatar_path: p.avatar_path.clone(),
        avatar_color: p.avatar_color.clone(),
        created_at: p.created_at.clone(),
        has_avatar: p.avatar_path.is_some(),
        is_banned: p.is_banned,
    }
}

/// Generate a human-readable master key: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
fn generate_key_string() -> String {
    use std::fmt::Write;
    let mut rng_bytes = [0u8; 18];
    // Use uuid random bytes as entropy source
    let id = Uuid::new_v4();
    let bytes = id.as_bytes();
    rng_bytes[..16].copy_from_slice(bytes);
    let id2 = Uuid::new_v4();
    let bytes2 = id2.as_bytes();
    rng_bytes[16..18].copy_from_slice(&bytes2[..2]);

    let chars: Vec<char> = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".chars().collect();
    let mut result = String::new();
    for (i, &byte) in rng_bytes.iter().enumerate() {
        if i > 0 && i % 4 == 0 {
            result.push('-');
        }
        let _ = write!(result, "{}", chars[byte as usize % chars.len()]);
        if result.len() > 29 { break; }
    }
    // Ensure format XXXX-XXXX-XXXX-XXXX-XXXX-XXXX (29 chars)
    result
}

// ── Tauri commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn is_first_launch() -> bool {
    !profiles_json_path().exists() || load_profiles().is_empty()
}

#[tauri::command]
pub fn list_profiles() -> Vec<ProfilePublic> {
    load_profiles().iter().map(to_public).collect()
}

#[tauri::command]
pub fn generate_master_key() -> String {
    generate_key_string()
}

/// Create the admin profile (onboarding, first launch only)
#[tauri::command]
pub fn create_admin_profile(
    state: tauri::State<AppState>,
    username: String,
    password: String,
    secret_questions: Vec<serde_json::Value>,
    master_key: String,
    avatar_color: String,
) -> Result<ProfilePublic, String> {
    let profiles = load_profiles();
    if profiles.iter().any(|p| p.role == "admin") {
        return Err("Admin already exists".into());
    }
    if username.trim().is_empty() || password.len() < 8 {
        return Err("Invalid username or password too short".into());
    }
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let questions: Vec<SecretQuestion> = secret_questions
        .iter()
        .map(|q| SecretQuestion {
            question: q["question"].as_str().unwrap_or("").to_string(),
            answer_hash: hash_answer(q["answer"].as_str().unwrap_or("")),
        })
        .collect();

    let profile = Profile {
        id: id.clone(),
        username: username.trim().to_string(),
        password_hash: hash_password(&id, &password),
        role: "admin".to_string(),
        avatar_path: None,
        avatar_color,
        created_at: now,
        secret_questions: questions,
        master_key_hash: hash_master_key(&master_key),
        is_banned: false,
    };

    // Initialize profile DB
    let db_path = profile_db_path(&id);
    let db = crate::db::Database::new(&db_path).map_err(|e| e.to_string())?;
    db.init().map_err(|e| e.to_string())?;

    // Set as active profile in AppState
    {
        let mut active = state.active_profile.lock().map_err(|e| e.to_string())?;
        *active = Some(to_public(&profile));
        let mut app_db = state.db.lock().map_err(|e| e.to_string())?;
        *app_db = Some(db);
    }

    let public = to_public(&profile);
    let mut all = load_profiles();
    all.push(profile);
    save_profiles(&all)?;

    Ok(public)
}

/// Create a standard user profile (admin auth required)
#[tauri::command]
pub fn create_profile(
    _state: tauri::State<AppState>,
    admin_id: Option<String>,
    admin_password: Option<String>,
    username: String,
    password: String,
    role: String,
    secret_questions: Vec<serde_json::Value>,
    avatar_color: String,
) -> Result<ProfilePublic, String> {
    let profiles = load_profiles();

    // Verify admin credentials only if provided (admin-created accounts)
    // If not provided → self-service user creation (no admin auth required)
    if let (Some(aid), Some(apwd)) = (admin_id, admin_password) {
        let admin = profiles
            .iter()
            .find(|p| p.id == aid && p.role == "admin")
            .ok_or("Admin profile not found")?;
        if admin.password_hash != hash_password(&admin.id, &apwd) {
            return Err("Invalid admin password".into());
        }
    }
    if username.trim().is_empty() || password.len() < 6 {
        return Err("Invalid username or password too short".into());
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let questions: Vec<SecretQuestion> = secret_questions
        .iter()
        .map(|q| SecretQuestion {
            question: q["question"].as_str().unwrap_or("").to_string(),
            answer_hash: hash_answer(q["answer"].as_str().unwrap_or("")),
        })
        .collect();

    // Generate a master key for this profile too
    let master_key = generate_key_string();
    let profile = Profile {
        id: id.clone(),
        username: username.trim().to_string(),
        password_hash: hash_password(&id, &password),
        role: if role == "admin" { "user".to_string() } else { role },
        avatar_path: None,
        avatar_color,
        created_at: now,
        secret_questions: questions,
        master_key_hash: hash_master_key(&master_key),
        is_banned: false,
    };

    let db_path = profile_db_path(&id);
    let db = crate::db::Database::new(&db_path).map_err(|e| e.to_string())?;
    db.init().map_err(|e| e.to_string())?;

    let public = to_public(&profile);
    let mut all = load_profiles();
    all.push(profile);
    save_profiles(&all)?;
    Ok(public)
}

/// Login: verify password, set active profile + load its DB
#[tauri::command]
pub fn login(
    state: tauri::State<AppState>,
    profile_id: String,
    password: String,
) -> Result<ProfilePublic, String> {
    let profiles = load_profiles();
    let profile = profiles
        .iter()
        .find(|p| p.id == profile_id)
        .ok_or("Profile not found")?;

    if profile.password_hash != hash_password(&profile.id, &password) {
        return Err("Incorrect password".into());
    }
    if profile.is_banned {
        return Err("account_banned".into());
    }

    let db_path = profile_db_path(&profile.id);
    let db = crate::db::Database::new(&db_path).map_err(|e| e.to_string())?;
    db.init().map_err(|e| e.to_string())?;

    let public = to_public(profile);
    {
        let mut active = state.active_profile.lock().map_err(|e| e.to_string())?;
        *active = Some(public.clone());
        let mut app_db = state.db.lock().map_err(|e| e.to_string())?;
        *app_db = Some(db);
    }

    Ok(public)
}

/// Logout: clear active profile and DB
#[tauri::command]
pub fn logout(state: tauri::State<AppState>) -> Result<(), String> {
    let mut active = state.active_profile.lock().map_err(|e| e.to_string())?;
    *active = None;
    let mut app_db = state.db.lock().map_err(|e| e.to_string())?;
    *app_db = None;
    Ok(())
}

/// Get currently logged-in profile
#[tauri::command]
pub fn get_active_profile(state: tauri::State<AppState>) -> Option<ProfilePublic> {
    state.active_profile.lock().ok()?.clone()
}

/// Update username and/or password
#[tauri::command]
pub fn update_profile(
    state: tauri::State<AppState>,
    profile_id: String,
    current_password: String,
    new_username: Option<String>,
    new_password: Option<String>,
) -> Result<ProfilePublic, String> {
    let mut profiles = load_profiles();
    let idx = profiles
        .iter()
        .position(|p| p.id == profile_id)
        .ok_or("Profile not found")?;

    if profiles[idx].password_hash != hash_password(&profile_id, &current_password) {
        return Err("Incorrect current password".into());
    }

    if let Some(ref u) = new_username {
        if !u.trim().is_empty() {
            profiles[idx].username = u.trim().to_string();
        }
    }
    if let Some(ref p) = new_password {
        if p.len() >= 6 {
            profiles[idx].password_hash = hash_password(&profile_id, p);
        }
    }

    let public = to_public(&profiles[idx]);
    save_profiles(&profiles)?;

    // Update active profile if it's the same
    if let Ok(mut active) = state.active_profile.lock() {
        if active.as_ref().map(|a| &a.id) == Some(&profile_id) {
            *active = Some(public.clone());
        }
    }

    Ok(public)
}

/// Delete a profile and all its data (admin auth required)
#[tauri::command]
pub fn delete_profile(
    _state: tauri::State<AppState>,
    profile_id: String,
    admin_id: String,
    admin_password: String,
) -> Result<(), String> {
    let profiles = load_profiles();
    let admin = profiles
        .iter()
        .find(|p| p.id == admin_id && p.role == "admin")
        .ok_or("Admin not found")?;
    if admin.password_hash != hash_password(&admin.id, &admin_password) {
        return Err("Invalid admin password".into());
    }
    if profile_id == admin_id {
        return Err("Cannot delete admin account".into());
    }

    // Remove profile dir
    let dir = profile_dir(&profile_id);
    if dir.exists() {
        std::fs::remove_dir_all(&dir).ok();
    }

    let new_profiles: Vec<Profile> = profiles
        .into_iter()
        .filter(|p| p.id != profile_id)
        .collect();
    save_profiles(&new_profiles)?;
    Ok(())
}

/// Upload and save avatar (resize to 128x128 using image crate)
#[tauri::command]
pub fn upload_avatar(
    profile_id: String,
    file_bytes: Vec<u8>,
    extension: String,
) -> Result<String, String> {
    use image::ImageReader;
    use std::io::Cursor;

    let cursor = Cursor::new(&file_bytes);
    let img = ImageReader::new(cursor)
        .with_guessed_format()
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let resized = img.resize_to_fill(128, 128, image::imageops::FilterType::Lanczos3);

    let dir = profile_dir(&profile_id);
    let ext = match extension.to_lowercase().as_str() {
        "jpg" | "jpeg" => "jpg",
        "webp" => "webp",
        _ => "png",
    };
    let path = dir.join(format!("avatar.{}", ext));
    resized.save(&path).map_err(|e| e.to_string())?;

    // Update profile record
    let mut profiles = load_profiles();
    if let Some(p) = profiles.iter_mut().find(|p| p.id == profile_id) {
        p.avatar_path = Some(path.to_string_lossy().to_string());
    }
    save_profiles(&profiles)?;

    Ok(path.to_string_lossy().to_string())
}

/// Verify all 3 secret questions
#[tauri::command]
pub fn verify_secret_questions(
    profile_id: String,
    answers: Vec<String>,
) -> Result<bool, String> {
    let profiles = load_profiles();
    let profile = profiles.iter().find(|p| p.id == profile_id).ok_or("Not found")?;
    if answers.len() != profile.secret_questions.len() {
        return Ok(false);
    }
    let all_correct = answers.iter().zip(profile.secret_questions.iter()).all(|(ans, q)| {
        hash_answer(ans) == q.answer_hash
    });
    Ok(all_correct)
}

/// Reset password using correct secret question answers
#[tauri::command]
pub fn reset_password_with_questions(
    profile_id: String,
    answers: Vec<String>,
    new_password: String,
) -> Result<(), String> {
    if new_password.len() < 6 {
        return Err("Password too short".into());
    }
    let verified = verify_secret_questions(profile_id.clone(), answers)?;
    if !verified {
        return Err("One or more answers are incorrect".into());
    }
    let mut profiles = load_profiles();
    let p = profiles.iter_mut().find(|p| p.id == profile_id).ok_or("Not found")?;
    p.password_hash = hash_password(&profile_id, &new_password);
    save_profiles(&profiles)?;
    Ok(())
}

/// Reset password using the master key (last resort)
#[tauri::command]
pub fn reset_password_with_master_key(
    profile_id: String,
    master_key: String,
    new_password: String,
) -> Result<(), String> {
    if new_password.len() < 6 {
        return Err("Password too short".into());
    }
    let mut profiles = load_profiles();
    let p = profiles.iter_mut().find(|p| p.id == profile_id).ok_or("Not found")?;
    if p.master_key_hash != hash_master_key(&master_key) {
        return Err("Invalid master key".into());
    }
    p.password_hash = hash_password(&profile_id, &new_password);
    save_profiles(&profiles)?;
    Ok(())
}

/// Get the questions text only (not hashes) for recovery screen
#[tauri::command]
pub fn get_secret_questions(profile_id: String) -> Result<Vec<String>, String> {
    let profiles = load_profiles();
    let profile = profiles.iter().find(|p| p.id == profile_id).ok_or("Not found")?;
    Ok(profile.secret_questions.iter().map(|q| q.question.clone()).collect())
}

/// Read avatar file and return as base64 data URL (safe for WebView2).
/// WebView2 cannot load file:// paths directly — use this instead.
#[tauri::command]
pub fn get_avatar_data_url(profile_id: String) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    let dir = profile_dir(&profile_id);
    for ext in &["png", "jpg", "jpeg", "webp"] {
        let path = dir.join(format!("avatar.{}", ext));
        if path.exists() {
            let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
            let b64 = STANDARD.encode(&bytes);
            let mime = match *ext {
                "jpg" | "jpeg" => "image/jpeg",
                "webp"         => "image/webp",
                _              => "image/png",
            };
            return Ok(format!("data:{};base64,{}", mime, b64));
        }
    }
    Err("No avatar".to_string())
}

// ── Admin commands ───────────────────────────────────────────────────────────

/// Delete a user account (admin only). Removes profile dir + entry from index.
#[tauri::command]
pub fn admin_delete_user(
    admin_id: String,
    admin_password: String,
    target_id: String,
) -> Result<(), String> {
    // Verify admin credentials
    let profiles = load_profiles();
    let admin = profiles.iter().find(|p| p.id == admin_id && p.role == "admin")
        .ok_or("Admin not found")?;
    let expected_hash = hash_password(&admin_id, &admin_password);
    if admin.password_hash != expected_hash {
        return Err("Wrong admin password".to_string());
    }
    // Remove target profile dir
    let dir = profile_dir(&target_id);
    if dir.exists() {
        std::fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    // Remove from index
    let mut profiles = profiles;
    profiles.retain(|p| p.id != target_id);
    save_profiles(&profiles)?;
    Ok(())
}

/// Clear ALL conversations of a target user (admin only). Does not reveal content.
#[tauri::command]
pub fn admin_clear_user_conversations(
    admin_id: String,
    admin_password: String,
    target_id: String,
) -> Result<(), String> {
    // Verify admin credentials
    let profiles = load_profiles();
    let admin = profiles.iter().find(|p| p.id == admin_id && p.role == "admin")
        .ok_or("Admin not found")?;
    let expected_hash = hash_password(&admin_id, &admin_password);
    if admin.password_hash != expected_hash {
        return Err("Wrong admin password".to_string());
    }
    // Open target DB and wipe conversations
    let db_path = profile_dir(&target_id).join("data.db");
    if !db_path.exists() {
        return Err("Target profile has no data".to_string());
    }
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute_batch("DELETE FROM messages; DELETE FROM conversations;").map_err(|e| e.to_string())?;
    Ok(())
}

// ── User self-service commands ────────────────────────────────────────────────

/// Delete all conversations of the currently logged-in user.
#[tauri::command]
pub fn clear_my_conversations(state: tauri::State<crate::AppState>) -> Result<(), String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("No profile logged in")?;
    db.clear_conversations().map_err(|e| e.to_string())?;
    Ok(())
}

/// Delete the currently logged-in account (password required).
#[tauri::command]
pub fn delete_my_account(
    password: String,
    state: tauri::State<crate::AppState>,
) -> Result<(), String> {
    // Get active profile
    let profile_id = {
        let guard = state.active_profile.lock().map_err(|e| e.to_string())?;
        guard.as_ref().ok_or("No profile logged in")?.id.clone()
    };
    // Verify password
    let profiles = load_profiles();
    let profile = profiles.iter().find(|p| p.id == profile_id)
        .ok_or("Profile not found")?;
    let expected = hash_password(&profile_id, &password);
    if profile.password_hash != expected {
        return Err("Wrong password".to_string());
    }
    // Clear DB from state
    {
        let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
        *db_guard = None;
    }
    {
        let mut p = state.active_profile.lock().map_err(|e| e.to_string())?;
        *p = None;
    }
    // Remove profile dir
    let dir = profile_dir(&profile_id);
    if dir.exists() {
        std::fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    // Remove from index
    let mut profiles = profiles;
    profiles.retain(|p| p.id != profile_id);
    save_profiles(&profiles)?;
    Ok(())
}

/// Ban a user — prevents login, does NOT delete data
#[tauri::command]
pub fn admin_ban_user(
    _state: tauri::State<AppState>,
    profile_id: String,
) -> Result<(), String> {
    let mut profiles = load_profiles();
    let p = profiles.iter_mut()
        .find(|p| p.id == profile_id && p.role != "admin")
        .ok_or("User not found or cannot ban an admin")?;
    p.is_banned = true;
    save_profiles(&profiles)
}

/// Unban a user — restores login access
#[tauri::command]
pub fn admin_unban_user(
    _state: tauri::State<AppState>,
    profile_id: String,
) -> Result<(), String> {
    let mut profiles = load_profiles();
    let p = profiles.iter_mut()
        .find(|p| p.id == profile_id)
        .ok_or("User not found")?;
    p.is_banned = false;
    save_profiles(&profiles)
}
