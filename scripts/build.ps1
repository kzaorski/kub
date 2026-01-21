# KUB Build Script for Windows PowerShell
# Usage: .\scripts\build.ps1

Write-Host "Building KUB..." -ForegroundColor Cyan

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
Set-Location frontend
npm run build
Set-Location ..

# Copy frontend to backend static
Write-Host "Copying frontend to backend..." -ForegroundColor Yellow
if (Test-Path backend\cmd\kub\static) {
    Remove-Item -Recurse -Force backend\cmd\kub\static
}
Copy-Item -Recurse frontend\dist backend\cmd\kub\static

# Build backend
Write-Host "Building backend..." -ForegroundColor Yellow
Set-Location backend
go build -o ..\bin\kub.exe .\cmd\kub
Set-Location ..

Write-Host ""
Write-Host "Build complete! Run with: .\bin\kub.exe" -ForegroundColor Green
