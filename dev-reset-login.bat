@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║    AI Widget — Reset LOGIN uniquement                ║
echo ║    (profiles.json supprimé, données conservées)      ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo Ce reset supprime UNIQUEMENT profiles.json
echo Les conversations, RAG et mémoires sont CONSERVÉS
echo Les modèles LLM (Ollama/GGUF/Whisper/Piper) ne sont PAS touchés
echo.
set /p confirm=Continuer ? (o/N) : 
if /i not "%confirm%"=="o" (
    echo Annulé.
    pause
    exit /b 0
)

set TARGET=%LOCALAPPDATA%\aiwidget\profiles\profiles.json

if exist "%TARGET%" (
    del /f /q "%TARGET%"
    echo.
    echo [OK] profiles.json supprimé
    echo [OK] Onboarding Admin activé au prochain lancement
) else (
    echo.
    echo [INFO] profiles.json déjà absent - rien à faire
)

echo.
echo ══════════════════════════════════════════════════════
echo  Lance AI Widget pour voir l'écran création Admin.
echo ══════════════════════════════════════════════════════
echo.
pause
