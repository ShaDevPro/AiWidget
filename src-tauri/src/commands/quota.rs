use crate::AppState;
use crate::models::UserQuota;
use crate::quota_service::QuotaService;

#[tauri::command]
pub fn get_user_quota(state: tauri::State<'_, AppState>) -> Result<UserQuota, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard
        .as_ref()
        .ok_or_else(|| "No profile logged in".to_string())?;

    let (profile_id, is_admin) = {
        let prof_guard = state.active_profile.lock().map_err(|e| e.to_string())?;
        if let Some(ref p) = *prof_guard {
            (p.id.clone(), p.role == "admin")
        } else {
            ("default".to_string(), false)
        }
    };

    QuotaService::get_quota(db, &profile_id, is_admin)
}

#[tauri::command]
pub fn set_user_quota_limit(
    state: tauri::State<'_, AppState>,
    limit: u32,
) -> Result<(), String> {
    // Only admin can change quota limits
    {
        let prof_guard = state.active_profile.lock().map_err(|e| e.to_string())?;
        if let Some(ref p) = *prof_guard {
            if p.role != "admin" {
                return Err("Unauthorized: only admin can modify quota limit".to_string());
            }
        } else {
            return Err("No active session".to_string());
        }
    }

    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard
        .as_ref()
        .ok_or_else(|| "No profile logged in".to_string())?;

    QuotaService::set_limit(db, limit)
}
