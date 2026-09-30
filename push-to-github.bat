@echo off
setlocal
title Push NexusIT Operations to GitHub (YenukaRanathunga/itadmin)

set "GIT_CMD=%~dp0..\mingit\cmd\git.exe"
if not exist "%GIT_CMD%" set "GIT_CMD=C:\Users\Asus\.gemini\antigravity\scratch\mingit\cmd\git.exe"

cd /d "%~dp0"

echo ========================================================
echo   NexusIT Operations - GitHub Push (YenukaRanathunga)
echo ========================================================
echo.
echo Target Repository: https://github.com/YenukaRanathunga/itadmin.git
echo.

"%GIT_CMD%" remote remove origin >nul 2>&1
"%GIT_CMD%" remote add origin https://github.com/YenukaRanathunga/itadmin.git
"%GIT_CMD%" branch -M main

echo Trying to push...
"%GIT_CMD%" push -u origin main --force

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  SUCCESS! All code and data pushed to GitHub!
    echo  View repository: https://github.com/YenukaRanathunga/itadmin
    echo ========================================================
    echo.
    pause
    exit /b
)

echo.
echo --------------------------------------------------------
echo  GitHub requires authentication (Personal Access Token).
echo --------------------------------------------------------
echo.
echo If you don't have a token yet:
echo 1. Open: https://github.com/settings/tokens
echo 2. Click "Generate new token (classic)", tick [x] repo
echo 3. Copy the token (starts with ghp_...)
echo.
set /p GH_TOKEN="Paste your GitHub Personal Access Token (PAT) here: "

if not "%GH_TOKEN%"=="" (
    echo.
    echo Pushing with Token...
    "%GIT_CMD%" push https://%GH_TOKEN%@github.com/YenukaRanathunga/itadmin.git main --force
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================================
        echo  SUCCESS! All code and data pushed to GitHub!
        echo  View repository: https://github.com/YenukaRanathunga/itadmin
        echo ========================================================
    ) else (
        echo.
        echo [!] Push failed. Please check the token permissions.
    )
)

echo.
pause
