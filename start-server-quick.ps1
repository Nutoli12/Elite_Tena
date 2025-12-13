Write-Host "========================================" -ForegroundColor Green
Write-Host "Starting Elite-Tena Backend Server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "🚀 Starting Backend Server on Port 3005..." -ForegroundColor Yellow
Set-Location server

try {
    npm start
} catch {
    Write-Host "❌ Failed to start server. Make sure you're in the project root directory." -ForegroundColor Red
    Write-Host "💡 Try running: cd server && npm install && npm start" -ForegroundColor Yellow
}

Read-Host "Press Enter to exit"