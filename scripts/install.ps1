# KUB Install Dependencies Script for Windows PowerShell
# Usage: .\scripts\install.ps1

Write-Host "Installing KUB dependencies..." -ForegroundColor Cyan

# Get the project root directory (parent of scripts folder)
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

# Install Go dependencies
Write-Host "Installing Go dependencies..." -ForegroundColor Yellow
Push-Location $backendPath
try {
    go mod tidy
    if ($LASTEXITCODE -ne 0) { throw "Go mod tidy failed" }
} finally {
    Pop-Location
}

# Install Node dependencies
Write-Host "Installing Node dependencies..." -ForegroundColor Yellow
Push-Location $frontendPath
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Dependencies installed!" -ForegroundColor Green
Write-Host "Run 'make dev' (macOS/Linux) or '.\scripts\dev.ps1' (Windows) to start" -ForegroundColor Cyan
