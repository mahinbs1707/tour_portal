# Story 1.1 matrix smoke checks against a running Compose stack.
# Usage (from repo root, stack already up):
#   powershell -File deploy/smoke-check.ps1
#   $env:HOST_PORT=8080; powershell -File deploy/smoke-check.ps1
$ErrorActionPreference = 'Stop'
$port = if ($env:HOST_PORT) { $env:HOST_PORT } else { '8080' }
$base = "http://127.0.0.1:$port"

function Fail([string]$Message) {
  Write-Error "FAIL: $Message"
  exit 1
}

Write-Output "Smoke: base URL $base"

function Fetch([string]$Url, [string]$OutFile, [string]$HeaderFile) {
  $curlArgs = @('-sS', '-D', $HeaderFile, '-o', $OutFile, $Url)
  & curl.exe @curlArgs
  if ($LASTEXITCODE -ne 0) { Fail "curl failed for $Url (exit $LASTEXITCODE)" }
}

$spaFile = Join-Path $env:TEMP 'tour-spa.html'
$spaHdr = Join-Path $env:TEMP 'tour-spa-hdr.txt'
Fetch "$base/" $spaFile $spaHdr
$spaHeaders = Get-Content $spaHdr -Raw
if ($spaHeaders -notmatch '(?m)^HTTP/\S+\s+200\b') { Fail 'SPA did not return HTTP 200' }
if ($spaHeaders -notmatch '(?im)content-type:\s*text/html') { Fail 'SPA content-type is not text/html' }
$spa = Get-Content $spaFile -Raw
if ($spa -notmatch 'Tour Portal') { Fail 'SPA body missing Tour Portal title' }

$healthFile = Join-Path $env:TEMP 'tour-health.json'
$apiHdr = Join-Path $env:TEMP 'tour-api-hdr.txt'
Fetch "$base/api/health/" $healthFile $apiHdr
$apiHeaders = Get-Content $apiHdr -Raw
if ($apiHeaders -notmatch '(?m)^HTTP/\S+\s+200\b') { Fail '/api/health/ did not return HTTP 200' }
if ($apiHeaders -notmatch 'application/json') { Fail '/api/health/ is not application/json' }
$health = (Get-Content $healthFile -Raw).Trim()
if ($health -notmatch '"status"\s*:\s*"ok"') { Fail '/api/health/ body missing "status":"ok"' }
if ($health -match 'Tour Portal|<!doctype html') { Fail '/api/health/ returned SPA HTML' }

# Bare reserved prefixes — 301 with published host:port (do not follow redirects)
foreach ($path in @('/api', '/media', '/django-admin')) {
  $redirHdr = Join-Path $env:TEMP ("tour-redir-" + ($path.Trim('/').Replace('/', '-')) + ".txt")
  $redirBody = Join-Path $env:TEMP ("tour-redir-" + ($path.Trim('/').Replace('/', '-')) + ".body")
  Fetch "$base$path" $redirBody $redirHdr
  $rh = Get-Content $redirHdr -Raw
  if ($rh -notmatch '(?m)^HTTP/\S+\s+301\b') { Fail "$path did not return HTTP 301" }
  if ($rh -notmatch "(?im)Location:\s*http://127\.0\.0\.1:$([regex]::Escape($port))$([regex]::Escape($path))/") {
    Fail "$path Location must preserve :$port (got headers without expected Location)"
  }
  $rb = Get-Content $redirBody -Raw -ErrorAction SilentlyContinue
  if ($rb -and ($rb -match '<title>Tour Portal</title>')) { Fail "$path redirect body fell back to SPA" }
}

$mediaFile = Join-Path $env:TEMP 'tour-media.html'
$mediaHdr = Join-Path $env:TEMP 'tour-media-hdr.txt'
Fetch "$base/media/missing-smoke.jpg" $mediaFile $mediaHdr
$mediaHeaders = Get-Content $mediaHdr -Raw
if ($mediaHeaders -notmatch '(?m)^HTTP/\S+\s+404\b') { Fail '/media/* missing file should be 404' }
$mediaBody = Get-Content $mediaFile -Raw
if ($mediaBody -match '<title>Tour Portal</title>') { Fail '/media/* fell back to SPA' }

$adminFile = Join-Path $env:TEMP 'tour-admin.html'
$adminHdr = Join-Path $env:TEMP 'tour-admin-hdr.txt'
Fetch "$base/django-admin/" $adminFile $adminHdr
$adminHeaders = Get-Content $adminHdr -Raw
if ($adminHeaders -notmatch '(?m)^HTTP/\S+\s+(302|301|200)\b') { Fail '/django-admin/ unexpected status' }
$adminBody = Get-Content $adminFile -Raw
if ($adminBody -match '<title>Tour Portal</title>') { Fail '/django-admin/ fell back to SPA' }

if (-not (Test-Path .env.example)) { Fail '.env.example missing' }
if (-not (Select-String -Path .env.example -Pattern 'HOST_PORT=8080')) { Fail '.env.example missing HOST_PORT=8080' }
if (-not (Select-String -Path .env.example -Pattern 'BUSINESS_TIMEZONE=Asia/Dhaka')) { Fail '.env.example missing BUSINESS_TIMEZONE' }
if (-not (Select-String -Path .env.example -Pattern 'change-me|placeholder|generate-a-local')) { Fail '.env.example lacks placeholder markers' }
if (Select-String -Path .env.example -Pattern '^(sk_live_|AKIA)') { Fail '.env.example looks like real secrets' }
if (-not (Select-String -Path .gitignore -Pattern '^\.env$')) { Fail '.gitignore does not ignore .env' }
if (-not (Select-String -Path .gitignore -Pattern '^!\.env\.example$')) { Fail '.gitignore does not keep .env.example' }

# No hardcoded SECRET_KEY fallback in settings source
$settingsSrc = Get-Content backend/config/settings.py -Raw
if ($settingsSrc -match 'SECRET_KEY\s*=\s*["''][^"'']+["'']') {
  Fail 'backend/config/settings.py appears to hardcode SECRET_KEY'
}
if ($settingsSrc -notmatch 'DJANGO_SECRET_KEY must be set') {
  Fail 'backend/config/settings.py missing fail-closed DJANGO_SECRET_KEY message'
}

$healthLines = @(docker compose -f deploy/docker-compose.yml --env-file .env ps --format '{{.Service}}={{.Health}}')
$healthMap = @{}
foreach ($line in $healthLines) {
  if ($line -match '^([^=]+)=(.*)$') { $healthMap[$Matches[1]] = $Matches[2] }
}
if ($healthMap['postgres'] -ne 'healthy') { Fail "postgres health is '$($healthMap['postgres'])', expected healthy" }
if ($healthMap['backend'] -ne 'healthy') { Fail "backend health is '$($healthMap['backend'])', expected healthy" }

$migPlan = docker compose -f deploy/docker-compose.yml --env-file .env exec -T backend python manage.py showmigrations --plan
if ($LASTEXITCODE -ne 0) { Fail 'showmigrations --plan failed' }
if ($migPlan -match '\[ \]') { Fail 'unapplied migrations remain ([ ] in showmigrations --plan)' }

$btz = (docker compose -f deploy/docker-compose.yml --env-file .env exec -T backend python -c "import os; print(os.environ.get('BUSINESS_TIMEZONE',''))").Trim()
if ($btz -ne 'Asia/Dhaka') { Fail "BUSINESS_TIMEZONE is '$btz', expected Asia/Dhaka" }

function Get-DotEnvValue([string]$Key) {
  $line = Get-Content .env | Where-Object { $_ -match ("^" + [regex]::Escape($Key) + "=") } | Select-Object -First 1
  if (-not $line) { return '' }
  return (($line -split '=', 2)[1]).Trim()
}
$adminEmail = Get-DotEnvValue 'ADMIN_EMAIL'
$adminPassword = Get-DotEnvValue 'ADMIN_PASSWORD'
if ($adminEmail -and $adminPassword) {
  $adminCheck = (docker compose -f deploy/docker-compose.yml --env-file .env exec -T backend python manage.py shell -c "import os; from accounts.models import User, Role; e=os.environ.get('ADMIN_EMAIL','').strip().lower(); u=User.objects.filter(email=e).first(); print('ok' if u and u.role==Role.ADMIN and u.is_staff else 'missing')").Trim()
  if ($LASTEXITCODE -ne 0) { Fail 'Admin seed smoke check failed to exec' }
  if ($adminCheck -ne 'ok') { Fail "seeded Admin missing or invalid for ADMIN_EMAIL (got '$adminCheck')" }
}

Write-Output 'PASS: Story 1.1 smoke matrix checks'
