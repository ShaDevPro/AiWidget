use tauri::command;
use crate::enterprise_policy::{EnterprisePolicy, PolicyDetector};

#[command]
pub fn get_enterprise_policy() -> EnterprisePolicy {
    PolicyDetector::detect()
}
