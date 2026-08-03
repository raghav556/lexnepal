$ErrorActionPreference = "Stop"

$runtimeRoot = Join-Path $env:LOCALAPPDATA "LexNepal"
$postgresData = Join-Path $runtimeRoot "PostgreSQL\data"
$postgresInstallation = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction Stop |
  Sort-Object { [int]$_.Name } -Descending |
  Select-Object -First 1
$pgCtl = Join-Path $postgresInstallation.FullName "bin\pg_ctl.exe"

if (Test-Path (Join-Path $postgresData "PG_VERSION")) {
  & $pgCtl status --pgdata=$postgresData *> $null
  if ($LASTEXITCODE -eq 0) { & $pgCtl stop --pgdata=$postgresData --mode=fast --wait }
}

$escapedRuntimeRoot = [regex]::Escape((Join-Path $runtimeRoot "MinIO\data"))
Get-CimInstance Win32_Process -Filter "Name = 'minio.exe'" |
  Where-Object { $_.CommandLine -match $escapedRuntimeRoot } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

$escapedClamAvRoot = [regex]::Escape((Join-Path $runtimeRoot "ClamAV"))
Get-CimInstance Win32_Process -Filter "Name = 'clamd.exe'" |
  Where-Object { $_.CommandLine -match $escapedClamAvRoot } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

$escapedMailpitRoot = [regex]::Escape((Join-Path $runtimeRoot "Mailpit"))
Get-CimInstance Win32_Process -Filter "Name = 'mailpit.exe'" |
  Where-Object { $_.ExecutablePath -match $escapedMailpitRoot } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

Write-Output "LexNepal local PostgreSQL, MinIO, ClamAV and Mailpit stopped."
