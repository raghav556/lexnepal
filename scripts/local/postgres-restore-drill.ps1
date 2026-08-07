# Restore the newest LexNepal dump into a separate DB, smoke-count, then drop.
# Does NOT overwrite the live lexnepal database.
$ErrorActionPreference = "Stop"

$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$environmentFile = Join-Path $workspaceRoot ".env.local"
if (-not (Test-Path $environmentFile)) { throw ".env.local missing" }

function Get-DotEnvValue([string]$name) {
  $line = Get-Content -LiteralPath $environmentFile |
    Where-Object { $_ -match "^$([regex]::Escape($name))=" } |
    Select-Object -Last 1
  if (-not $line) { throw "$name is missing from .env.local" }
  return ($line -replace "^[^=]+=", "").Trim()
}

$databaseUrl = Get-DotEnvValue "DATABASE_URL"
if ($databaseUrl -notmatch "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?\s]+)") {
  throw "Could not parse DATABASE_URL"
}
$dbUser = $Matches[1]
$dbPass = $Matches[2]
$dbHost = $Matches[3]
$dbPort = $Matches[4]
$liveDb = $Matches[5]
$drillDb = "lexnepal_restore_drill"

if ($liveDb -eq $drillDb) { throw "Live DB name collides with drill DB" }

$postgresInstallation = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction Stop |
  Sort-Object { [int]$_.Name } -Descending |
  Select-Object -First 1
$bin = Join-Path $postgresInstallation.FullName "bin"
$psql = Join-Path $bin "psql.exe"
$pgRestore = Join-Path $bin "pg_restore.exe"
$createdb = Join-Path $bin "createdb.exe"
$dropdb = Join-Path $bin "dropdb.exe"

$backupRoot = Join-Path $env:LOCALAPPDATA "LexNepal\backups"
$latest = Get-ChildItem -LiteralPath $backupRoot -Filter "lexnepal-*.dump" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if (-not $latest) {
  Write-Host "No dump found — running backup first..."
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "postgres-backup.ps1")
  if ($LASTEXITCODE -ne 0) { throw "Backup failed" }
  $latest = Get-ChildItem -LiteralPath $backupRoot -Filter "lexnepal-*.dump" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}
if (-not $latest) { throw "No backup dump available" }

$env:PGPASSWORD = $dbPass
try {
  $terminateSql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$drillDb' AND pid <> pg_backend_pid();"
  & $psql -h $dbHost -p $dbPort -U $dbUser -d postgres -v ON_ERROR_STOP=1 -c $terminateSql | Out-Null
  & $dropdb -h $dbHost -p $dbPort -U $dbUser --if-exists $drillDb
  & $createdb -h $dbHost -p $dbPort -U $dbUser -O $dbUser $drillDb
  if ($LASTEXITCODE -ne 0) { throw "createdb failed" }

  & $pgRestore -h $dbHost -p $dbPort -U $dbUser -d $drillDb --no-owner --no-acl $latest.FullName
  $countSql = "SELECT json_build_object('firms', (SELECT count(*) FROM firms), 'users', (SELECT count(*) FROM users), 'testimonials', (SELECT count(*) FROM testimonials));"
  $countsRaw = & $psql -h $dbHost -p $dbPort -U $dbUser -d $drillDb -t -A -c $countSql
  if ($LASTEXITCODE -ne 0) { throw "Smoke count query failed — restore likely incomplete" }
  $counts = $countsRaw.Trim()
  if (-not $counts) { throw "Empty smoke counts" }

  & $dropdb -h $dbHost -p $dbPort -U $dbUser --if-exists $drillDb

  $result = [ordered]@{
    ok = $true
    dump = $latest.FullName
    drillDb = $drillDb
    dropped = $true
    smokeCountsJson = $counts
    ranAt = (Get-Date).ToUniversalTime().ToString("o")
  }
  $logPath = Join-Path $backupRoot "restore-drill-latest.json"
  ($result | ConvertTo-Json -Depth 5) | Set-Content -LiteralPath $logPath -Encoding UTF8
  Write-Output ($result | ConvertTo-Json -Compress)
  Write-Host "Restore drill OK (live DB untouched). Log: $logPath"
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
