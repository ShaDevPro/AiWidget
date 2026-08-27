# PowerShell Build Script for AI Widget Standalone .exe
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Generation de l'executable autonome AI Widget (.exe) " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Compilation du Frontend (HTML / TypeScript / CSS)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Echec de la compilation du frontend."
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[2/3] Compilation du binaire natif Windows (Rust / Tauri)..." -ForegroundColor Yellow
npm run tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Echec de la compilation du binaire natif."
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[3/3] Preparation du dossier de distribution release/..." -ForegroundColor Yellow
if (-not (Test-Path "release")) {
    New-Item -ItemType Directory -Path "release" | Out-Null
}

$nsis = Get-ChildItem "src-tauri\target\release\bundle\nsis\*.exe" -ErrorAction SilentlyContinue
if ($nsis) {
    Copy-Item $nsis.FullName "release\AI-Widget-Setup.exe" -Force
    Write-Host "  -> Installateur autonome copie dans : release\AI-Widget-Setup.exe" -ForegroundColor Green
}

$msi = Get-ChildItem "src-tauri\target\release\bundle\msi\*.msi" -ErrorAction SilentlyContinue
if ($msi) {
    Copy-Item $msi.FullName "release\AI-Widget-Setup.msi" -Force
    Write-Host "  -> Installateur MSI copie dans : release\AI-Widget-Setup.msi" -ForegroundColor Green
}

$portable = "src-tauri\target\release\AI Widget.exe"
if (Test-Path $portable) {
    Copy-Item $portable "release\AI-Widget-Portable.exe" -Force
    Write-Host "  -> Executable portable copie dans : release\AI-Widget-Portable.exe" -ForegroundColor Green
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  SUCCES : Vos executables .exe sont prets dans release/ " -ForegroundColor Green
Write-Host "  Les utilisateurs n'ont besoin d'aucun Node.js ni outil." -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
