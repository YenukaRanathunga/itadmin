@echo off
title NexusIT Operations - Local Server & Browser
cd /d "%~dp0"
echo ========================================================
echo   Starting NexusIT Operations...
echo ========================================================
echo.
echo Opening browser at http://localhost:5000 ...
start http://localhost:5000
echo.
echo Starting local web server with database.json auto-save...
echo (Keep this black command window open while working!)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
