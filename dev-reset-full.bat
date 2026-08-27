@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║    AI Widget — Reset COMPLET Onboarding ^& Profils   ║
echo ║    (remise à zéro de l''accueil et des comptes)       ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo Ce reset supprime :
echo   - Profils et comptes
echo   - Conversations et messages
echo   - Documents RAG et mémoires IA
echo   - Cache de l''application et flag Onboarding
echo.
echo [CONSERVÉ] Vos modèles LLM (Ollama, GGUF, Whisper) restent INTACTS et ne seront PAS supprimés.
echo.
set /p confirm=Continuer ? (o/N) : 
if /i not "%confirm%"=="o" (
    echo Annulé.
    pause
    exit /b 0
)

set TARGET_PROFILES=%LOCALAPPDATA%\aiwidget\profiles
set TARGET_WEBVIEW=%LOCALAPPDATA%\com.aiwidget.app\EBWebView
set TARGET_DB=%LOCALAPPDATA%\AIWidget\aiwidget.db

if exist "%TARGET_PROFILES%" (
    rmdir /s /q "%TARGET_PROFILES%"
    echo [OK] Dossier profiles\ supprimé
)

if exist "%TARGET_WEBVIEW%" (
    rmdir /s /q "%TARGET_WEBVIEW%"
    echo [OK] Cache WebView2 et localStorage réinitialisés
)

if exist "%TARGET_DB%" (
    del /f /q "%TARGET_DB%"
    echo [OK] Base de données principale réinitialisée
)

echo.
echo [OK] Écran Admin et Onboarding réactivés avec succès !
echo.
echo ══════════════════════════════════════════════════════
echo  Lancez AI Widget pour tester l''Onboarding complet.
echo ══════════════════════════════════════════════════════
echo.
pause
