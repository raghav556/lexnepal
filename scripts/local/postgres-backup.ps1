# Local Postgres logical backup for LexNepal.
# Output: %LOCALAPPDATA%\LexNepal\backups\lexnepal-YYYYMMDD-HHmmss.dump
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
# postgresql://user:pass@127.0.0.1:5433/lexnepal
if ($databaseUrl -notmatch "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?\s]+)") {
  throw "Could not parse DATABASE_URL"
}
$dbUser = $Matches[1]
$dbPass = $Matches[2]
$dbHost = $Matches[3]
$dbPort = $Matches[4]
$dbName = $Matches[5]

$postgresInstallation = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction Stop |
  Sort-Object { [int]$_.Name } -Descending |
  Select-Object -First 1
$pgDump = Join-Path $postgresInstallation.FullName "bin\pg_dump.exe"
if (-not (Test-Path $pgDump)) { throw "pg_dump.exe not found at $pgDump" }

$backupRoot = Join-Path $env:LOCALAPPDATA "LexNepal\backups"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $backupRoot "lexnepal-$stamp.dump"

$env:PGPASSWORD = $dbPass
try {
  & $pgDump -h $dbHost -p $dbPort -U $dbUser -d $dbName -F c -f $outFile
  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit $LASTEXITCODE" }
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

$meta = @{
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
  database = $dbName
  host = $dbHost
  port = $dbPort
  file = $outFile
  bytes = (Get-Item $outFile).Length
}
$metaPath = Join-Path $backupRoot "lexnepal-$stamp.json"
$meta | ConvertTo-Json | Set-Content -LiteralPath $metaPath -Encoding UTF8

Write-Output ($meta | ConvertTo-Json -Compress)
Write-Host "Backup OK: $outFile"
