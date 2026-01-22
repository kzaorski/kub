# KUB Development Script for Windows PowerShell
# Usage: .\scripts\dev.ps1

Write-Host "Starting KUB development servers..." -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8080" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host ""

# Get the project root directory (parent of scripts folder)
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

# Start backend in new window
Start-Process powershell -ArgumentList @(
    "-NoExit"
    "-Command"
    "Set-Location '$backendPath'; Write-Host 'KUB Backend' -ForegroundColor Cyan; go run .\cmd\kub"
) -WorkingDirectory $backendPath

# Start frontend in new window
Start-Process powershell -ArgumentList @(
    "-NoExit"
    "-Command"
    "Set-Location '$frontendPath'; Write-Host 'KUB Frontend' -ForegroundColor Cyan; npm run dev"
) -WorkingDirectory $frontendPath

Write-Host "Started backend and frontend in separate windows." -ForegroundColor Yellow
Write-Host "Close those windows to stop the servers." -ForegroundColor Yellow
