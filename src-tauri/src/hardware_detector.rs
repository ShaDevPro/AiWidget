use serde::{Deserialize, Serialize};
use sysinfo::System;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HardwareSpecs {
    pub cpu_name: String,
    pub cpu_cores: usize,
    pub cpu_threads: usize,
    pub total_ram_gb: f32,
    pub available_ram_gb: f32,
    pub gpu_name: String,
    pub gpu_vram_gb: f32,
    pub has_discrete_gpu: bool,
    pub tier: String,
    pub recommended_model_id: String,
    pub recommended_model_name: String,
    pub estimated_speed_tokens_sec: String,
    pub score: u8,
    pub profile_label_key: String,
}

pub struct HardwareDetector;

impl HardwareDetector {
    pub fn detect() -> HardwareSpecs {
        let mut sys = System::new_all();
        sys.refresh_all();

        // ── 1. CPU Info ───────────────────────────────────────────────
        let cpu_name = sys
            .cpus()
            .first()
            .map(|c| c.brand().trim().to_string())
            .unwrap_or_else(|| "Processeur Inconnu".to_string());

        let cpu_cores = sys.physical_core_count().unwrap_or(sys.cpus().len().max(1));
        let cpu_threads = sys.cpus().len().max(1);

        // ── 2. RAM Info ───────────────────────────────────────────────
        let total_ram_bytes = sys.total_memory();
        let total_ram_gb = ((total_ram_bytes as f64 / (1024.0 * 1024.0 * 1024.0)) * 10.0).round() as f32 / 10.0;
        let available_ram_bytes = sys.available_memory();
        let available_ram_gb = ((available_ram_bytes as f64 / (1024.0 * 1024.0 * 1024.0)) * 10.0).round() as f32 / 10.0;

        // ── 3. GPU Info (Windows WMI/CIM query) ────────────────────────
        let (gpu_name, gpu_vram_gb, has_discrete_gpu) = Self::detect_gpu();

        // ── 4. Determine Hardware Tier & Recommendation ───────────────
        let (tier, recommended_model_id, recommended_model_name, estimated_speed, score, profile_label_key) =
            Self::evaluate_tier(cpu_cores, total_ram_gb, &gpu_name, gpu_vram_gb, has_discrete_gpu);

        HardwareSpecs {
            cpu_name,
            cpu_cores,
            cpu_threads,
            total_ram_gb,
            available_ram_gb,
            gpu_name,
            gpu_vram_gb,
            has_discrete_gpu,
            tier,
            recommended_model_id,
            recommended_model_name,
            estimated_speed_tokens_sec: estimated_speed,
            score,
            profile_label_key,
        }
    }

    #[cfg(target_os = "windows")]
    fn detect_gpu() -> (String, f32, bool) {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let output = std::process::Command::new("powershell")
            .args(&[
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM | ConvertTo-Json -Compress",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        if let Ok(out) = output {
            if out.status.success() {
                let text = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !text.is_empty() {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                        let mut best_name = String::new();
                        let mut best_vram = 0.0_f32;
                        let mut is_discrete = false;

                        let items = if let Some(arr) = val.as_array() {
                            arr.clone()
                        } else {
                            vec![val]
                        };

                        for item in items {
                            let name = item["Name"].as_str().unwrap_or("").trim().to_string();
                            let vram_raw = item["AdapterRAM"].as_f64().unwrap_or(0.0);
                            let vram_gb = (vram_raw / (1024.0 * 1024.0 * 1024.0) * 10.0).round() as f32 / 10.0;

                            let upper = name.to_uppercase();
                            let discrete = upper.contains("NVIDIA")
                                || upper.contains("GEFORCE")
                                || upper.contains("RTX")
                                || upper.contains("GTX")
                                || upper.contains("RADEON RX")
                                || upper.contains("ARC A")
                                || upper.contains("QUADRO")
                                || upper.contains("TESLA");

                            if discrete {
                                is_discrete = true;
                                best_name = name;
                                best_vram = vram_gb.max(best_vram);
                                break;
                            } else if best_name.is_empty() {
                                best_name = name;
                                best_vram = vram_gb;
                            }
                        }

                        if !best_name.is_empty() {
                            return (best_name, best_vram, is_discrete);
                        }
                    }
                }
            }
        }

        ("Graphiques intégrés".to_string(), 0.0, false)
    }

    #[cfg(not(target_os = "windows"))]
    fn detect_gpu() -> (String, f32, bool) {
        ("Graphiques standard".to_string(), 0.0, false)
    }

    fn evaluate_tier(
        cpu_cores: usize,
        total_ram_gb: f32,
        gpu_name: &str,
        gpu_vram_gb: f32,
        has_discrete_gpu: bool,
    ) -> (String, String, String, String, u8, String) {
        let upper_gpu = gpu_name.to_uppercase();

        // ── Tier 4: Enthusiast / High-End GPU / Workstation (>= 12GB VRAM or RTX 3080/4080/4090)
        if has_discrete_gpu
            && (gpu_vram_gb >= 11.0
                || upper_gpu.contains("4090")
                || upper_gpu.contains("4080")
                || upper_gpu.contains("3090")
                || upper_gpu.contains("3080")
                || upper_gpu.contains("7900")
                || (total_ram_gb >= 32.0 && gpu_vram_gb >= 8.0))
        {
            return (
                "gpu_high".to_string(),
                "qwen2.5:14b".to_string(),
                "Qwen 2.5 14B / Mistral 7B".to_string(),
                "60-100+ tokens/s".to_string(),
                5,
                "hardware.tierGpuHigh".to_string(),
            );
        }

        // ── Tier 3: Mid-Range GPU (RTX 3050/3060/4060, GTX 1660, 4-8GB VRAM)
        if has_discrete_gpu && (gpu_vram_gb >= 4.0 || upper_gpu.contains("RTX") || upper_gpu.contains("GTX") || upper_gpu.contains("RADEON")) {
            return (
                "gpu_mid".to_string(),
                "mistral:7b".to_string(),
                "Mistral 7B (Haute Précision)".to_string(),
                "35-65 tokens/s".to_string(),
                4,
                "hardware.tierGpuMid".to_string(),
            );
        }

        // ── Tier 2: Strong Multi-Core CPU (>= 6 cores & >= 15GB RAM, e.g. Core i5/i7/i9 or Ryzen 5/7)
        if cpu_cores >= 6 && total_ram_gb >= 15.0 {
            return (
                "cpu_mid".to_string(),
                "llama3.2:3b".to_string(),
                "Llama 3.2 3B (Équilibré)".to_string(),
                "18-30 tokens/s".to_string(),
                3,
                "hardware.tierCpuMid".to_string(),
            );
        }

        // ── Tier 1: Entry CPU / Office PC / Thin Laptop (i3, Celeron, Athlon, <= 16GB RAM without GPU)
        (
            "cpu_entry".to_string(),
            "qwen2.5:1.5b".to_string(),
            "Qwen 2.5 1.5B (Ultra Rapide)".to_string(),
            "30-50 tokens/s".to_string(),
            2,
            "hardware.tierCpuEntry".to_string(),
        )
    }

    /// Context window size tuned for modest vs high-end machines.
    pub fn recommended_num_ctx(specs: &HardwareSpecs) -> u32 {
        if specs.has_discrete_gpu && specs.gpu_vram_gb >= 8.0 {
            8192
        } else if specs.total_ram_gb >= 16.0 {
            8192
        } else {
            4096
        }
    }

    pub fn recommended_ctx_size_str(specs: &HardwareSpecs) -> &'static str {
        if Self::recommended_num_ctx(specs) >= 8192 {
            "8192"
        } else {
            "4096"
        }
    }
}

#[tauri::command]
pub fn get_hardware_specs() -> HardwareSpecs {
    HardwareDetector::detect()
}
