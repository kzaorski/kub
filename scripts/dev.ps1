# KUB Development Script for Windows PowerShell
# Usage: .\scripts\dev.ps1

Write-Host "Starting KUB development servers..." -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8080" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host ""

# Start backend in background
$backend = Start-Job -ScriptBlock {
    Set-Location $using:PWD\backend
    go run ./cmd/kub
}

# Start frontend in background
$frontend = Start-Job -ScriptBlock {
    Set-Location $using:PWD\frontend
    npm run dev
}

Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

try {
    while ($true) {
        # Show output from both jobs
        Receive-Job $backend -ErrorAction SilentlyContinue
        Receive-Job $frontend -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host "`nStopping servers..." -ForegroundColor Yellow
    Stop-Job $backend, $frontend -ErrorAction SilentlyContinue
    Remove-Job $backend, $frontend -ErrorAction SilentlyContinue
}
