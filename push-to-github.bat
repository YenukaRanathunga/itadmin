@echo off
setlocal
title Push NexusIT Operations to GitHub (YenukaRanathunga/itadmin)

set "GIT_CMD=%~dp0..\mingit\cmd\git.exe"
if not exist "%GIT_CMD%" set "GIT_CMD=C:\Users\Asus\.gemini\antigravity\scratch\mingit\cmd\git.exe"

cd /d "%~dp0"

echo ========================================================
echo   NexusIT Operations - Push to GitHub
echo ========================================================
echo.
echo Target Repository: https://github.com/YenukaRanathunga/itadmin.git
echo.

"%GIT_CMD%" remote remove origin >nul 2>&1
"%GIT_CMD%" remote add origin https://github.com/YenukaRanathunga/itadmin.git
"%GIT_CMD%" branch -M main

echo Pushing all files and history to GitHub...
echo (If a browser window or login prompt pops up, please authorize or sign in)
echo.

"%GIT_CMD%" push -u origin main --force

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  SUCCESS! All project files successfully pushed!
    echo  View repository: https://github.com/YenukaRanathunga/itadmin
    echo ========================================================
) else (
    echo.
    echo [!] Push failed or authorization was cancelled.
    echo If you have a Personal Access Token (PAT), you can also enter it when prompted.
)

echo.
pause
