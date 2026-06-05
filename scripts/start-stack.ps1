# Start Video Downloader stack and verify http://127.0.0.1:3000 is reachable.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not installed or not on PATH. Install Docker Desktop and try again."
}

$info = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker is not running. Start Docker Desktop, wait until it is ready, then run this script again."
}

Write-Host "Starting stack..."
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Waiting for frontend on http://127.0.0.1:3000 ..."
$ok = $false
foreach ($i in 1..30) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:3000/" -UseBasicParsing -TimeoutSec 5
        if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch { Start-Sleep -Seconds 2 }
}

docker compose ps

if ($ok) {
    Write-Host ""
    Write-Host "OK — open in your browser (use http, not https):" -ForegroundColor Green
    Write-Host "  http://127.0.0.1:3000"
    Write-Host "  http://127.0.0.1        (via Nginx, includes API)"
} else {
    Write-Host ""
    Write-Error "Frontend did not respond on port 3000. Check: docker compose logs frontend"
}
