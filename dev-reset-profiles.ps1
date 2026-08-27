# ── AI Widget — Dev Reset Script ─────────────────────────────────────────────
# Supprime UNIQUEMENT les données de profils pour retomber sur l'onboarding.
# Les modèles LLM (Ollama + GGUF + Whisper + Piper) ne sont PAS touchés.
# Usage:
#   .\dev-reset-profiles.ps1                  → reset complet (profils + données)
#   .\dev-reset-profiles.ps1 -KeepConversations → reset login seulement
#   .\dev-reset-profiles.ps1 -Force           → sans confirmation
# ─────────────────────────────────────────────────────────────────────────────

param(
    [switch]$KeepConversations,
    [switch]$Force
)

$profilesDir  = "$env:LOCALAPPDATA\aiwidget\profiles"
$profilesJson = "$profilesDir\profiles.json"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         AI Widget — Dev Reset (Profils)              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($KeepConversations) {
    Write-Host "Mode : Reset LOGIN uniquement (profiles.json seulement)" -ForegroundColor Yellow
    Write-Host "→ Onboarding Admin au prochain lancement" -ForegroundColor White
    Write-Host "→ Conversations/RAG/mémoires CONSERVÉS" -ForegroundColor Green
} else {
    Write-Host "Mode : Reset COMPLET (profils + toutes les données)" -ForegroundColor Yellow
    Write-Host "→ Onboarding Admin au prochain lancement" -ForegroundColor White
    Write-Host "→ Conversations, RAG et mémoires SUPPRIMÉS" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ NON touchés : Ollama models, GGUF, Whisper, Piper" -ForegroundColor Green
Write-Host ""

if (-not $Force) {
    $confirm = Read-Host "Continuer ? (o/N)"
    if ($confirm -notin @("o","O","oui","Oui")) {
        Write-Host "Annulé." -ForegroundColor Gray; exit 0
    }
}

if ($KeepConversations) {
    if (Test-Path $profilesJson) {
        Remove-Item $profilesJson -Force
        Write-Host "✅ profiles.json supprimé → onboarding activé" -ForegroundColor Green
    } else {
        Write-Host "ℹ  profiles.json déjà absent" -ForegroundColor Gray
    }
} else {
    if (Test-Path $profilesDir) {
        Remove-Item $profilesDir -Recurse -Force
        Write-Host "✅ profiles\ supprimé intégralement" -ForegroundColor Green
    } else {
        Write-Host "ℹ  profiles\ déjà absent" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Reset OK. Lance AI Widget → écran onboarding Admin." -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
