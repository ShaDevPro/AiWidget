@echo off
setlocal enabledelayedexpansion

echo =======================================================
echo   Compilation et creation du package AI Widget .exe
echo =======================================================
echo.

echo (1/3) Compilation du frontend Vite / TypeScript...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Echec de la compilation du frontend.
    exit /b %ERRORLEVEL%
)

echo.
echo (2/3) Compilation de l'executable natif Windows (Tauri)...
call npm run tauri build
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Echec de la compilation Tauri.
    exit /b %ERRORLEVEL%
)

echo.
echo (3/3) Copie des fichiers vers le dossier release...
if not exist "release" mkdir "release"

if exist "src-tauri\target\release\bundle\nsis\*.exe" (
    for %%f in ("src-tauri\target\release\bundle\nsis\*.exe") do (
        copy /Y "%%f" "release\AI-Widget-Setup.exe" > nul
        echo  - Installateur setup copie dans : release\AI-Widget-Setup.exe
    )
)

if exist "src-tauri\target\release\bundle\msi\*.msi" (
    for %%f in ("src-tauri\target\release\bundle\msi\*.msi") do (
        copy /Y "%%f" "release\AI-Widget-Setup.msi" > nul
        echo  - Installateur MSI copie dans : release\AI-Widget-Setup.msi
    )
)

if exist "src-tauri\target\release\AI Widget.exe" (
    copy /Y "src-tauri\target\release\AI Widget.exe" "release\AI-Widget-Portable.exe" > nul
    echo  - Executable portable copie dans : release\AI-Widget-Portable.exe
)

echo.
echo =======================================================
echo   SUCCES : Les fichiers .exe sont prets dans release\
echo =======================================================
pause
