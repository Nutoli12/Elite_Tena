@echo off
echo Stopping any existing processes on port 3003...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3003') do (
    if not "%%a"=="0" (
        echo Killing process %%a
        taskkill /PID %%a /F >nul 2>&1
    )
)

echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo Starting backend server...
cd server
start "Backend Server" cmd /k "npm run dev"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo Starting frontend...
cd ..\frontend
start "Frontend Server" cmd /k "npm run dev"

echo Development environment started!
echo Backend: http://localhost:3003
echo Frontend: http://localhost:5173
pause