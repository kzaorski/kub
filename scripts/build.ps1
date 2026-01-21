# KUB Build Script for Windows PowerShell
# Usage: .\scripts\build.ps1

Write-Host "Building KUB..." -ForegroundColor Cyan

# Get the project root directory (parent of scripts folder)
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"
$binPath = Join-Path $projectRoot "bin"

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
Push-Location $frontendPath
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
} finally {
    Pop-Location
}

# Copy frontend to backend static
Write-Host "Copying frontend to backend..." -ForegroundColor Yellow
$staticPath = Join-Path $backendPath "cmd\kub\static"
if (Test-Path $staticPath) {
    Remove-Item -Recurse -Force $staticPath
}
Copy-Item -Recurse (Join-Path $frontendPath "dist") $staticPath

# Build backend
Write-Host "Building backend..." -ForegroundColor Yellow
Push-Location $backendPath
try {
    if (-not (Test-Path $binPath)) {
        New-Item -ItemType Directory -Path $binPath | Out-Null
    }
    go build -o (Join-Path $binPath "kub.exe") .\cmd\kub
    if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Build complete! Run with: .\bin\kub.exe" -ForegroundColor Green
