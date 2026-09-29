@echo off
title NexusIT Operations - Local Web Server
cd /d "%~dp0"
echo ========================================================
echo   Starting NexusIT Operations Local Web Server...
echo ========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
