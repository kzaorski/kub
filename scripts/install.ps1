# KUB Install Dependencies Script for Windows PowerShell
# Usage: .\scripts\install.ps1

Write-Host "Installing KUB dependencies..." -ForegroundColor Cyan

# Install Go dependencies
Write-Host "Installing Go dependencies..." -ForegroundColor Yellow
Set-Location backend
go mod tidy
Set-Location ..

# Install Node dependencies
Write-Host "Installing Node dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
Set-Location ..

Write-Host ""
Write-Host "Dependencies installed!" -ForegroundColor Green
Write-Host "Run 'make dev' (macOS/Linux) or '.\scripts\dev.ps1' (Windows) to start" -ForegroundColor Cyan
