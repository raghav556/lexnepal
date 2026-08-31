$ErrorActionPreference = "Stop"
$runtimeRoot = Join-Path $env:LOCALAPPDATA "LexNepal"
$postgresData = Join-Path $runtimeRoot "PostgreSQL\data"
$postgresInstallation = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory | Sort-Object { [int]$_.Name } -Descending | Select-Object -First 1
$postgresExe = Join-Path $postgresInstallation.FullName "bin\postgres.exe"
& $postgresExe -D $postgresData -p 5433 -h 127.0.0.1
