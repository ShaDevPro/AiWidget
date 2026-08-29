// src-tauri/src/security_engine.rs
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use std::process::Command;

type HmacSha256 = Hmac<Sha256>;

// Anti-Brute-Force Rate Limiter State
pub struct RateLimiterState {
    pub consecutive_failures: u32,
    pub locked_until: Option<Instant>,
    pub last_attempt: Option<Instant>,
}

static RATE_LIMITER: Mutex<RateLimiterState> = Mutex::new(RateLimiterState {
    consecutive_failures: 0,
    locked_until: None,
    last_attempt: None,
});

// Windows native anti-debugging FFI
#[cfg(target_os = "windows")]
extern "system" {
    fn IsDebuggerPresent() -> i32;
    fn CheckRemoteDebuggerPresent(h_process: isize, pb_debugger_present: *mut i32) -> i32;
    fn GetCurrentProcess() -> isize;
}

pub struct SecurityEngine;

impl SecurityEngine {
    /// Reconstructs the master secret in stack memory, computes HMAC, and returns the hex signature
    pub fn compute_hmac(payload: &str) -> Result<String, String> {
        // Anti-debug check: poison the output if an active cracker/debugger is attached
        if Self::is_debugger_detected() {
            let poison_mac = Sha256::digest(b"POISONED_DEBUG_PAYLOAD");
            return Ok(hex::encode(poison_mac).to_uppercase());
        }

        // Master secret seed for signature verification
        let raw_salt = b"WIDGETAI_SECURE_MASTER_KEY_2026_PRO_LITE_SECRET_SEED_#8892!";
        let mut mac = HmacSha256::new_from_slice(raw_salt)
            .map_err(|e| format!("Erreur initialisation crypto: {}", e))?;
        mac.update(payload.as_bytes());
        let result = mac.finalize();
        Ok(hex::encode(result.into_bytes()).to_uppercase())
    }

    /// Signs an outgoing client HTTP request for the Enterprise Server
    pub fn sign_request(route: &str, timestamp: i64, hwid: &str) -> Result<String, String> {
        let payload = format!("AIW_REQ::{route}::{timestamp}::{hwid}");
        Self::compute_hmac(&payload)
    }

    /// Verifies incoming server response authenticity
    pub fn verify_server_signature(route: &str, timestamp: i64, server_sig: &str) -> bool {
        let payload = format!("AIW_RESP::{route}::{timestamp}");
        if let Ok(expected) = Self::compute_hmac(&payload) {
            expected.eq_ignore_ascii_case(server_sig)
        } else {
            false
        }
    }

    /// Detects if the process is attached to an interactive debugger (IDA Pro, x64dbg, CheatEngine)
    pub fn is_debugger_detected() -> bool {
        #[cfg(target_os = "windows")]
        unsafe {
            if IsDebuggerPresent() != 0 {
                return true;
            }
            let mut is_remote_present = 0;
            let process = GetCurrentProcess();
            if CheckRemoteDebuggerPresent(process, &mut is_remote_present) != 0 && is_remote_present != 0 {
                return true;
            }
        }
        false
    }

    /// Rate limiting check before attempting any sensitive cryptographic operation
    pub fn check_rate_limit(operation: &str) -> Result<(), String> {
        let mut state = RATE_LIMITER.lock().map_err(|_| "Erreur de verrouillage du rate limiter".to_string())?;
        let now = Instant::now();

        if let Some(locked_until) = state.locked_until {
            if now < locked_until {
                let remaining_secs = (locked_until - now).as_secs() + 1;
                return Err(format!(
                    "Sécurité Anti-Brute-Force active. Trop de tentatives infructueuses pour '{}'. Veuillez patienter {} seconde(s) avant de réessayer.",
                    operation, remaining_secs
                ));
            } else {
                state.locked_until = None;
            }
        }

        // Intentional cryptographic processing delay (prevents high-speed key scanning)
        std::thread::sleep(Duration::from_millis(400));
        state.last_attempt = Some(now);
        Ok(())
    }

    /// Records a failed validation attempt and escalates exponential backoff
    pub fn record_failure() -> u32 {
        if let Ok(mut state) = RATE_LIMITER.lock() {
            state.consecutive_failures += 1;
            let count = state.consecutive_failures;
            let now = Instant::now();

            if count >= 10 {
                state.locked_until = Some(now + Duration::from_secs(3600)); // 1 heure
            } else if count >= 5 {
                state.locked_until = Some(now + Duration::from_secs(300)); // 5 minutes
            } else if count >= 3 {
                state.locked_until = Some(now + Duration::from_secs(30)); // 30 secondes
            }
            count
        } else {
            1
        }
    }

    /// Resets the failure counter upon successful validation
    pub fn reset_failures() {
        if let Ok(mut state) = RATE_LIMITER.lock() {
            state.consecutive_failures = 0;
            state.locked_until = None;
        }
    }

    /// Generates multi-source composite Hardware Fingerprint (HWID)
    pub fn get_composite_hwid() -> String {
        let mut entropy = Vec::new();

        // 1. Registry MachineGuid
        if let Ok(output) = Command::new("reg")
            .args(&["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                if line.contains("MachineGuid") {
                    if let Some(guid) = line.split_whitespace().last() {
                        entropy.extend_from_slice(guid.as_bytes());
                    }
                }
            }
        }

        // 2. Motherboard / BIOS Serial Number (WMI)
        if let Ok(output) = Command::new("wmic")
            .args(&["bios", "get", "serialnumber"])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines().skip(1) {
                let trimmed = line.trim();
                if !trimmed.is_empty() && trimmed != "To be filled by O.E.M." && trimmed != "None" {
                    entropy.extend_from_slice(trimmed.as_bytes());
                    break;
                }
            }
        }

        // 3. CPU Processor Identifier
        if let Ok(proc_id) = std::env::var("PROCESSOR_IDENTIFIER") {
            entropy.extend_from_slice(proc_id.as_bytes());
        }

        // 4. Computer Name
        if let Ok(comp_name) = std::env::var("COMPUTERNAME") {
            entropy.extend_from_slice(comp_name.as_bytes());
        }

        if entropy.is_empty() {
            entropy.extend_from_slice(b"WIDGETAI_SECURE_FALLBACK_HWID_2026");
        }

        let mut hasher = Sha256::new();
        hasher.update(b"WIDGETAI_HWID_IMMUTABLE_SALT_V2");
        hasher.update(&entropy);
        let hash = hasher.finalize();
        let hex_str = hex::encode(hash).to_uppercase();

        format!(
            "{}-{}-{}-{}",
            &hex_str[0..4],
            &hex_str[4..8],
            &hex_str[8..12],
            &hex_str[12..16]
        )
    }

    /// Signs license vault data with an anti-tampering checksum
    pub fn sign_vault_data(content: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(b"WIDGETAI_VAULT_INTEGRITY_SALT_#7718");
        hasher.update(content.as_bytes());
        hex::encode(hasher.finalize()).to_uppercase()
    }
}
