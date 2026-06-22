# Start Video Downloader stack and verify the frontend port is reachable.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$FrontendPort = 3002
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*FRONTEND_HOST_PORT=(.+)$') {
            $FrontendPort = $Matches[1].Trim()
        }
    }
}

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

$frontendUrl = "http://127.0.0.1:$FrontendPort"
Write-Host "Waiting for frontend on $frontendUrl ..."
$ok = $false
foreach ($i in 1..30) {
    try {
        $r = Invoke-WebRequest -Uri "$frontendUrl/" -UseBasicParsing -TimeoutSec 5
        if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch { Start-Sleep -Seconds 2 }
}

docker compose ps

if ($ok) {
    Write-Host ""
    Write-Host "OK — open in your browser (use http, not https):" -ForegroundColor Green
    Write-Host "  $frontendUrl"
    Write-Host "  http://127.0.0.1        (via Nginx, includes API)"
} else {
    Write-Host ""
    Write-Error "Frontend did not respond on port $FrontendPort. Check: docker compose logs frontend"
}
