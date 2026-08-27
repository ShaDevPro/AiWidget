@echo off
title WidgetAI PRO - Enterprise Server
echo ============================================================
echo   🏢 Lancement du Serveur WidgetAI PRO (On-Premise)
echo ============================================================
echo.
cd /d "%~dp0server"
cargo run --release
pause
