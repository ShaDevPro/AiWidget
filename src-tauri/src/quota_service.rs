use crate::db::Database;
use crate::models::UserQuota;

pub const DEFAULT_DAILY_QUOTA: u32 = 100;

pub struct QuotaService;

impl QuotaService {
    pub fn get_quota(db: &Database, profile_id: &str, is_admin: bool) -> Result<UserQuota, String> {
        db.get_or_create_quota(profile_id, is_admin, DEFAULT_DAILY_QUOTA)
            .map_err(|e| e.to_string())
    }

    pub fn increment(db: &Database, profile_id: &str, is_admin: bool) -> Result<UserQuota, String> {
        db.increment_quota(profile_id, is_admin, DEFAULT_DAILY_QUOTA)
            .map_err(|e| e.to_string())
    }

    pub fn set_limit(db: &Database, limit: u32) -> Result<(), String> {
        db.set_quota_limit(limit)
            .map_err(|e| e.to_string())
    }
}
