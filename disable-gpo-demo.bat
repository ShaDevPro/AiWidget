@echo off
title Desactiver le Verrouillage GPO
echo ============================================================
echo   🔓 Desactivation de la Politique d'Entreprise
echo ============================================================
echo.
if exist "%ProgramData%\WidgetAI\enterprise_policy.json" del "%ProgramData%\WidgetAI\enterprise_policy.json"
echo [OK] Politique retiree. Mode standard retabli.
echo.
pause
