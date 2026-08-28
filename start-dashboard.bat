@echo off
title WidgetAI - Console Licences & Analytics Mondiale
echo ============================================================
echo   👑 Console de Gestion des Licences & Analytics WidgetAI
echo   🌐 Accessible sur : http://localhost:9090
echo ============================================================
echo.
cd /d "%~dp0license-dashboard"
node server.cjs
pause
