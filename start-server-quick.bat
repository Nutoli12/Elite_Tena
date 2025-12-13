@echo off
echo ========================================
echo Starting Elite-Tena Backend Server
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo Starting Backend Server on Port 3005...
cd server
npm start

pause