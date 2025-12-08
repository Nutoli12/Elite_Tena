@echo off
echo ========================================
echo Starting Elite-Tena Development Environment
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Start backend server in a new window
echo Starting Backend Server...
start "Elite-Tena Backend" cmd /k "cd server && npm start"
timeout /t 3 /nobreak >nul

REM Start frontend in a new window
echo Starting Frontend Application...
start "Elite-Tena Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Both servers are starting in separate windows
echo Backend: http://localhost:3001
echo Frontend: http://localhost:8080
echo ========================================
echo.
echo Press any key to exit this window (servers will continue running)
pause >nul




