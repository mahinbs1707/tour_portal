# Django env configuration validation (Story 1.1 patches 4/8/9).
# Runs backend/scripts/env_contract.py inside a one-off backend container.
$ErrorActionPreference = 'Continue'

function Fail([string]$Message) {
  Write-Host "FAIL: $Message" -ForegroundColor Red
  exit 1
}

Write-Output 'Config validate: Django settings env rules'

$outFile = Join-Path $env:TEMP ("tour-cfg-" + [guid]::NewGuid().ToString('N') + ".txt")
$errFile = Join-Path $env:TEMP ("tour-cfg-" + [guid]::NewGuid().ToString('N') + ".err")
$argList = @(
  'compose', '-f', 'deploy/docker-compose.yml', '--env-file', '.env',
  'run', '--rm', '--no-deps', '--entrypoint', 'python',
  'backend', 'scripts/env_contract.py'
)
$proc = Start-Process -FilePath 'docker' -ArgumentList $argList -NoNewWindow -Wait -PassThru `
  -RedirectStandardOutput $outFile -RedirectStandardError $errFile
$combined = ((Get-Content $outFile -Raw -ErrorAction SilentlyContinue) + "`n" +
  (Get-Content $errFile -Raw -ErrorAction SilentlyContinue))
Write-Output $combined
if ($proc.ExitCode -ne 0) {
  Fail "env_contract.py failed (exit $($proc.ExitCode))"
}
if ($combined -notmatch 'PASS: Story 1.1 configuration validation') {
  Fail 'missing PASS marker from env_contract.py'
}
Write-Output 'PASS: Story 1.1 configuration validation (wrapper)'
