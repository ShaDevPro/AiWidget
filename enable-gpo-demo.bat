@echo off
title Activer le Verrouillage GPO Entreprise
echo ============================================================
echo   🏢 Activation du Verrouillage Entreprise (GPO / InTune)
echo ============================================================
echo.
if not exist "%ProgramData%\WidgetAI" mkdir "%ProgramData%\WidgetAI"
(
echo {
echo   "is_managed": true,
echo   "locked_mode": "pro",
echo   "enforced_server_url": "http://serveur-ia.entreprise.lan:8080",
echo   "allow_mode_switch": false,
echo   "allow_local_models": false,
echo   "company_name": "Acme Corp International",
echo   "department": "Engineering"
echo }
) > "%ProgramData%\WidgetAI\enterprise_policy.json"
echo [OK] Politique appliquee dans %ProgramData%\WidgetAI\enterprise_policy.json
echo.
pause
