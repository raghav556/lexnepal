$ErrorActionPreference = "Stop"

$runtimeRoot = Join-Path $env:LOCALAPPDATA "LexNepal"
$mysqlData = Join-Path $runtimeRoot "MySQL\data"
$portableMysql = Join-Path $runtimeRoot "MySQL\server\mysql-8.4.9-winx64"
$mysqlInstallation = if (Test-Path (Join-Path $portableMysql "bin\mysqladmin.exe")) {
  Get-Item $portableMysql
} else {
  Get-ChildItem "C:\Program Files\MySQL" -Directory -ErrorAction SilentlyContinue |
    Where-Object { Test-Path (Join-Path $_.FullName "bin\mysqladmin.exe") } |
    Sort-Object Name -Descending |
    Select-Object -First 1
}
if ($mysqlInstallation -and (Test-Path (Join-Path $mysqlData "mysql"))) {
  $mysqlAdmin = Join-Path $mysqlInstallation.FullName "bin\mysqladmin.exe"
  & $mysqlAdmin --protocol=TCP --host=127.0.0.1 --port=3306 --user=root shutdown *> $null
}

$escapedClamAvRoot = [regex]::Escape((Join-Path $runtimeRoot "ClamAV"))
Get-CimInstance Win32_Process -Filter "Name = 'clamd.exe'" |
  Where-Object { $_.CommandLine -match $escapedClamAvRoot } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

$escapedMailpitRoot = [regex]::Escape((Join-Path $runtimeRoot "Mailpit"))
Get-CimInstance Win32_Process -Filter "Name = 'mailpit.exe'" |
  Where-Object { $_.ExecutablePath -match $escapedMailpitRoot } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

Write-Output "LexNepal local MySQL, ClamAV and Mailpit stopped."
