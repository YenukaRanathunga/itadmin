@echo off
setlocal
title Push NexusIT Operations to GitHub

set "GIT_CMD=C:\Users\Asus\.gemini\antigravity\scratch\mingit\cmd\git.exe"

echo ========================================================
echo       NexusIT Operations - GitHub Push Assistant
echo ========================================================
echo.
echo Make sure you have created an empty repository on GitHub:
echo (e.g. https://github.com/your-username/nexusit-operations)
echo.
set /p REPO_URL="Enter your GitHub Repository URL (HTTPS): "

if "%REPO_URL%"=="" (
    echo Error: No URL entered!
    pause
    exit /b
)

echo.
echo Setting remote origin to: %REPO_URL%
"%GIT_CMD%" remote remove origin >nul 2>&1
"%GIT_CMD%" remote add origin %REPO_URL%
"%GIT_CMD%" branch -M main

echo.
echo Pushing code to GitHub main branch...
"%GIT_CMD%" push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  SUCCESS! Code pushed to GitHub!
    echo ========================================================
    echo Now go to https://vercel.com, click "Add New Project",
    echo import your GitHub repo, and click "Deploy"!
) else (
    echo.
    echo [!] Push encountered an error or GitHub credentials prompt needed.
)

echo.
pause
