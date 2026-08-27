use anyhow::{Context, Result};
use std::path::{Path, PathBuf};
use std::process::Command;
use uuid::Uuid;

pub struct OCREngine;

impl OCREngine {
    /// Extracts text from an image file on disk using Windows Native Media OCR
    pub fn extract_from_path(path: &Path) -> Result<String> {
        let abs_path = std::fs::canonicalize(path)
            .unwrap_or_else(|_| path.to_path_buf());
        let path_str = abs_path.to_string_lossy().to_string();

        let ps_script = format!(
            r#"
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.Ocr.OcrEngine, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime] | Out-Null

$asTaskMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {{ 
    $_.Name -eq "AsTask" -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetGenericArguments().Count -eq 1 
}} | Select-Object -First 1

function Await-Op($op, [Type]$returnType) {{
    $gm = $asTaskMethod.MakeGenericMethod($returnType)
    $task = $gm.Invoke($null, @($op))
    $task.Wait()
    return $task.Result
}}

try {{
    $imgPath = "{path_str}"
    $file = Await-Op ([Windows.Storage.StorageFile]::GetFileFromPathAsync($imgPath)) ([Windows.Storage.StorageFile])
    $stream = Await-Op ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await-Op ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await-Op ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])

    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    if (-not $engine) {{
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new("fr-FR"))
    }}
    if (-not $engine) {{
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new("en-US"))
    }}

    $result = Await-Op ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    if ($result -and $result.Text) {{
        Write-Output $result.Text
    }}
}} catch {{
    Write-Error $_.Exception.Message
}}
"#,
            path_str = path_str.replace("\\", "\\\\")
        );

        let output = Command::new("powershell")
            .arg("-NoProfile")
            .arg("-NonInteractive")
            .arg("-Command")
            .arg(&ps_script)
            .output()
            .with_context(|| "Failed to execute Windows OCR via PowerShell")?;

        let raw_stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let cleaned = raw_stdout
            .replace("\r", "")
            .lines()
            .map(|l| l.trim())
            .filter(|l| !l.is_empty())
            .collect::<Vec<_>>()
            .join("\n");

        Ok(cleaned)
    }

    /// Extracts text from raw image bytes in memory
    pub fn extract_from_bytes(bytes: &[u8], extension: &str) -> Result<String> {
        let temp_dir = std::env::temp_dir();
        let ext = if extension.is_empty() { "png" } else { extension };
        let temp_file: PathBuf = temp_dir.join(format!("aiwidget_ocr_{}.{}", Uuid::new_v4(), ext));

        std::fs::write(&temp_file, bytes)
            .with_context(|| format!("Failed to write temp OCR image at {:?}", temp_file))?;

        let result = Self::extract_from_path(&temp_file);
        let _ = std::fs::remove_file(&temp_file);
        result
    }

    /// Extracts text from a base64 encoded data URI or raw base64 string
    pub fn extract_from_base64(base64_data: &str) -> Result<String> {
        let raw_b64 = if let Some(idx) = base64_data.find(";base64,") {
            &base64_data[idx + 8..]
        } else {
            base64_data
        };

        use base64::Engine;
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(raw_b64.trim())
            .with_context(|| "Failed to decode base64 image data")?;

        Self::extract_from_bytes(&bytes, "png")
    }
}