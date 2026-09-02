# Local MySQL logical backup for LexNepal.
# Output: %LOCALAPPDATA%\LexNepal\backups\lexnepal-YYYYMMDD-HHmmss.sql
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
if ($databaseUrl -notmatch "mysql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?\s]+)") {
  throw "Could not parse MySQL DATABASE_URL"
}
$dbUser = $Matches[1]
$dbPass = $Matches[2]
$dbHost = $Matches[3]
$dbPort = $Matches[4]
$dbName = $Matches[5]

$portableMysql = Join-Path $env:LOCALAPPDATA "LexNepal\MySQL\server\mysql-8.4.9-winx64"
$mysqlInstallation = if (Test-Path (Join-Path $portableMysql "bin\mysqldump.exe")) {
  Get-Item $portableMysql
} else {
  Get-ChildItem "C:\Program Files\MySQL" -Directory -ErrorAction Stop |
    Where-Object { Test-Path (Join-Path $_.FullName "bin\mysqldump.exe") } |
    Sort-Object Name -Descending |
    Select-Object -First 1
}
$mysqlDump = Join-Path $mysqlInstallation.FullName "bin\mysqldump.exe"

$backupRoot = Join-Path $env:LOCALAPPDATA "LexNepal\backups"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $backupRoot "lexnepal-$stamp.sql"

$env:MYSQL_PWD = $dbPass
try {
  & $mysqlDump --protocol=TCP --host=$dbHost --port=$dbPort --user=$dbUser --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF --result-file=$outFile $dbName
  if ($LASTEXITCODE -ne 0) { throw "mysqldump failed with exit $LASTEXITCODE" }
} finally {
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
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
