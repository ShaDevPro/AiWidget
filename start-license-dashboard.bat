@echo off
chcp 65001 > nul
title "WidgetAI - Console de Gestion des Licences et Clients"
echo ============================================================
echo   👑 WidgetAI — Console Indépendante de Gestion des Licences
echo ============================================================
echo.
echo Lancement du serveur d'administration des licences...
start "" "http://localhost:9090"
node license-dashboard\server.cjs
pause
