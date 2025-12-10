# Stop any existing processes on port 3003
Write-Host "Stopping any existing processes on port 3003..." -ForegroundColor Yellow
$processes = netstat -ano | Select-String ":3003" | ForEach-Object {
    $fields = $_ -split '\s+'
    if ($fields[4] -and $fields[4] -ne "0") {
        $fields[4]
    }
} | Sort-Object -Unique

foreach ($pid in $processes) {
    if ($pid -and $pid -ne "0") {
        Write-Host "Killing process $pid" -ForegroundColor Red
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        } catch {
            # Ignore errors
        }
    }
}

Write-Host "Waiting 2 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "Starting backend server..." -ForegroundColor Green
Set-Location server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal

Write-Host "Waiting 5 seconds for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Starting frontend..." -ForegroundColor Green
Set-Location ..\frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal

Set-Location ..

Write-Host "Development environment started!" -ForegroundColor Green
Write-Host "Backend: http://localhost:3003" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Press any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")