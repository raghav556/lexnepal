$ErrorActionPreference = "Stop"

$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$environmentFile = Join-Path $workspaceRoot ".env.local"
$runtimeRoot = Join-Path $env:LOCALAPPDATA "LexNepal"
$postgresData = Join-Path $runtimeRoot "PostgreSQL\data"
$postgresLog = Join-Path $runtimeRoot "PostgreSQL\postgres.log"
$minioData = Join-Path $runtimeRoot "MinIO\data"
$minioLogRoot = Join-Path $runtimeRoot "MinIO\logs"
$clamAvRoot = Join-Path $runtimeRoot "ClamAV"
$clamAvDatabase = Join-Path $clamAvRoot "database"
$clamAvLogRoot = Join-Path $clamAvRoot "logs"
$mailpitRoot = Join-Path $runtimeRoot "Mailpit"
$mailpitData = Join-Path $mailpitRoot "mailpit.db"
$mailpitLogRoot = Join-Path $mailpitRoot "logs"

function Get-DotEnvValue([string]$name) {
  $line = Get-Content -LiteralPath $environmentFile |
    Where-Object { $_ -match "^$([regex]::Escape($name))=" } |
    Select-Object -Last 1
  if (-not $line) { throw "$name is missing from .env.local" }
  return ($line -split "=", 2)[1]
}

$postgresInstallation = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction Stop |
  Sort-Object { [int]$_.Name } -Descending |
  Select-Object -First 1
$postgresBin = Join-Path $postgresInstallation.FullName "bin"
$pgCtl = Join-Path $postgresBin "pg_ctl.exe"
$initDb = Join-Path $postgresBin "initdb.exe"
$psql = Join-Path $postgresBin "psql.exe"
$createdb = Join-Path $postgresBin "createdb.exe"
$passwordFile = Join-Path $workspaceRoot ".local\postgres-password"

New-Item -ItemType Directory -Force -Path (Split-Path $postgresData), $minioData, $minioLogRoot, $clamAvDatabase, $clamAvLogRoot, $mailpitLogRoot | Out-Null

if (-not (Test-Path (Join-Path $postgresData "PG_VERSION"))) {
  & $initDb --pgdata=$postgresData --username=lexnepal --pwfile=$passwordFile --auth-host=scram-sha-256 --auth-local=scram-sha-256 --encoding=UTF8 --no-locale
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL cluster initialization failed" }
}

& $pgCtl status --pgdata=$postgresData *> $null
if ($LASTEXITCODE -ne 0) {
  & $pgCtl start --pgdata=$postgresData --log=$postgresLog --options="-p 5433 -h 127.0.0.1" --wait
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL startup failed" }
}

$env:PGPASSWORD = "lexnepal_local_dev"
$databaseExists = & $psql --host=127.0.0.1 --port=5433 --username=lexnepal --dbname=postgres --tuples-only --no-align --command="SELECT 1 FROM pg_database WHERE datname = 'lexnepal'"
if ($databaseExists -ne "1") {
  & $createdb --host=127.0.0.1 --port=5433 --username=lexnepal --encoding=UTF8 lexnepal
  if ($LASTEXITCODE -ne 0) { throw "LexNepal database creation failed" }
}
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

$minioCommand = Get-Command minio -ErrorAction SilentlyContinue
if ($minioCommand) {
  $minioPath = $minioCommand.Source
} else {
  $minioPath = Get-ChildItem (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages") -Recurse -Filter minio.exe -ErrorAction Stop |
    Select-Object -First 1 -ExpandProperty FullName
}

$minioHealthy = try {
  (Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:9000/minio/health/live" -TimeoutSec 2).StatusCode -eq 200
} catch { $false }

if (-not $minioHealthy) {
  $env:MINIO_ROOT_USER = Get-DotEnvValue "AWS_ACCESS_KEY_ID"
  $env:MINIO_ROOT_PASSWORD = Get-DotEnvValue "AWS_SECRET_ACCESS_KEY"
  Start-Process -FilePath $minioPath `
    -ArgumentList @("server", $minioData, "--address", "127.0.0.1:9000", "--console-address", "127.0.0.1:9001") `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $minioLogRoot "server.out.log") `
    -RedirectStandardError (Join-Path $minioLogRoot "server.err.log")

  $deadline = (Get-Date).AddSeconds(30)
  do {
    Start-Sleep -Milliseconds 500
    $minioHealthy = try {
      (Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:9000/minio/health/live" -TimeoutSec 2).StatusCode -eq 200
    } catch { $false }
  } until ($minioHealthy -or (Get-Date) -gt $deadline)
}

if (-not $minioHealthy) { throw "MinIO did not become healthy; inspect $minioLogRoot" }

$clamAvBin = "C:\Program Files\ClamAV"
$clamd = Join-Path $clamAvBin "clamd.exe"
$freshclam = Join-Path $clamAvBin "freshclam.exe"
if (-not (Test-Path $clamd) -or -not (Test-Path $freshclam)) {
  throw "ClamAV is not installed; install Cisco.ClamAV with winget"
}

$clamdConfig = Join-Path $clamAvRoot "clamd.conf"
$freshclamConfig = Join-Path $clamAvRoot "freshclam.conf"
$databaseConfigPath = $clamAvDatabase.Replace("\", "/")
$clamdLogPath = (Join-Path $clamAvLogRoot "clamd.log").Replace("\", "/")
$freshclamLogPath = (Join-Path $clamAvLogRoot "freshclam.log").Replace("\", "/")
$clamdTemplate = Get-Content -Raw -LiteralPath (Join-Path $workspaceRoot "config\local\clamav\clamd.conf.template")
$freshclamTemplate = Get-Content -Raw -LiteralPath (Join-Path $workspaceRoot "config\local\clamav\freshclam.conf.template")
[IO.File]::WriteAllText($clamdConfig, $clamdTemplate.Replace("__DATABASE_DIRECTORY__", $databaseConfigPath).Replace("__CLAMD_LOG__", $clamdLogPath))
[IO.File]::WriteAllText($freshclamConfig, $freshclamTemplate.Replace("__DATABASE_DIRECTORY__", $databaseConfigPath).Replace("__FRESHCLAM_LOG__", $freshclamLogPath))

$signatureFiles = Get-ChildItem $clamAvDatabase -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Extension -in ".cvd", ".cld" }
if (-not $signatureFiles) {
  & $freshclam --config-file=$freshclamConfig
  if ($LASTEXITCODE -ne 0) { throw "ClamAV signature download failed; inspect $freshclamLogPath" }
}

$clamAvHealthy = [bool](Get-NetTCPConnection -LocalPort 3310 -State Listen -ErrorAction SilentlyContinue)
if (-not $clamAvHealthy) {
  Start-Process -FilePath $clamd `
    -ArgumentList @("--config-file=$clamdConfig") `
    -WorkingDirectory $clamAvBin `
    -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(60)
  do {
    Start-Sleep -Milliseconds 500
    $clamAvHealthy = [bool](Get-NetTCPConnection -LocalPort 3310 -State Listen -ErrorAction SilentlyContinue)
  } until ($clamAvHealthy -or (Get-Date) -gt $deadline)
}

if (-not $clamAvHealthy) { throw "ClamAV did not become healthy; inspect $clamdLogPath" }

$mailpit = Join-Path $mailpitRoot "mailpit.exe"
if (-not (Test-Path $mailpit)) { throw "Mailpit is not installed at $mailpit" }
$mailpitHealthy = [bool](Get-NetTCPConnection -LocalPort 1025 -State Listen -ErrorAction SilentlyContinue)
if (-not $mailpitHealthy) {
  Start-Process -FilePath $mailpit `
    -ArgumentList @("--smtp", "127.0.0.1:1025", "--listen", "127.0.0.1:8025", "--database", $mailpitData, "--max", "500") `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $mailpitLogRoot "server.out.log") `
    -RedirectStandardError (Join-Path $mailpitLogRoot "server.err.log")
  $deadline = (Get-Date).AddSeconds(30)
  do {
    Start-Sleep -Milliseconds 500
    $mailpitHealthy = [bool](Get-NetTCPConnection -LocalPort 1025 -State Listen -ErrorAction SilentlyContinue)
  } until ($mailpitHealthy -or (Get-Date) -gt $deadline)
}
if (-not $mailpitHealthy) { throw "Mailpit did not become healthy; inspect $mailpitLogRoot" }

Write-Output "PostgreSQL: ready at 127.0.0.1:5433 (database: lexnepal)"
Write-Output "MinIO API:   http://127.0.0.1:9000"
Write-Output "MinIO UI:    http://127.0.0.1:9001"
Write-Output "ClamAV:      ready at 127.0.0.1:3310"
Write-Output "Mailpit SMTP: ready at 127.0.0.1:1025"
Write-Output "Mailpit UI:   http://127.0.0.1:8025"
Write-Output "Runtime data: $runtimeRoot"
