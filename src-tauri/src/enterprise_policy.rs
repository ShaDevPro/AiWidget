use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnterprisePolicy {
    pub is_managed: bool,
    pub locked_mode: Option<String>,
    pub enforced_server_url: Option<String>,
    pub allow_mode_switch: bool,
    pub allow_local_models: bool,
    pub company_name: Option<String>,
    pub department: Option<String>,
}

impl Default for EnterprisePolicy {
    fn default() -> Self {
        Self {
            is_managed: false,
            locked_mode: None,
            enforced_server_url: None,
            allow_mode_switch: true,
            allow_local_models: true,
            company_name: None,
            department: None,
        }
    }
}

pub struct PolicyDetector;

impl PolicyDetector {
    /// Detect enterprise policy from ProgramData configuration or Windows Registry
    pub fn detect() -> EnterprisePolicy {
        // 1. Check %ProgramData%\WidgetAI\enterprise_policy.json
        if let Some(program_data) = std::env::var_os("ProgramData") {
            let policy_file = PathBuf::from(program_data)
                .join("WidgetAI")
                .join("enterprise_policy.json");
            if policy_file.exists() {
                if let Ok(content) = std::fs::read_to_string(&policy_file) {
                    if let Ok(policy) = serde_json::from_str::<EnterprisePolicy>(&content) {
                        return policy;
                    }
                }
            }
        }

        // 2. Check local fallback file in app dir (for testing/demo)
        let local_demo = PathBuf::from("enterprise_policy.json");
        if local_demo.exists() {
            if let Ok(content) = std::fs::read_to_string(&local_demo) {
                if let Ok(policy) = serde_json::from_str::<EnterprisePolicy>(&content) {
                    return policy;
                }
            }
        }

        EnterprisePolicy::default()
    }
}
