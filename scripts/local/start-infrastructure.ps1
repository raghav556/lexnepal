$ErrorActionPreference = "Stop"

$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runtimeRoot = Join-Path $env:LOCALAPPDATA "LexNepal"
$mysqlRoot = Join-Path $runtimeRoot "MySQL"
$mysqlData = Join-Path $mysqlRoot "data"
$mysqlLog = Join-Path $mysqlRoot "mysql.err.log"
$mysqlPid = Join-Path $mysqlRoot "mysql.pid"
$storageRoot = Join-Path $workspaceRoot ".local\storage"
$clamAvRoot = Join-Path $runtimeRoot "ClamAV"
$clamAvDatabase = Join-Path $clamAvRoot "database"
$clamAvLogRoot = Join-Path $clamAvRoot "logs"
$mailpitRoot = Join-Path $runtimeRoot "Mailpit"
$mailpitData = Join-Path $mailpitRoot "mailpit.db"
$mailpitLogRoot = Join-Path $mailpitRoot "logs"

$portableMysql = Join-Path $mysqlRoot "server\mysql-8.4.9-winx64"
$mysqlInstallation = if (Test-Path (Join-Path $portableMysql "bin\mysqld.exe")) {
  Get-Item $portableMysql
} else {
  Get-ChildItem "C:\Program Files\MySQL" -Directory -ErrorAction Stop |
    Where-Object { Test-Path (Join-Path $_.FullName "bin\mysqld.exe") } |
    Sort-Object Name -Descending |
    Select-Object -First 1
}
$mysqlBin = Join-Path $mysqlInstallation.FullName "bin"
$mysqld = Join-Path $mysqlBin "mysqld.exe"
$mysql = Join-Path $mysqlBin "mysql.exe"
$mysqlAdmin = Join-Path $mysqlBin "mysqladmin.exe"

New-Item -ItemType Directory -Force -Path $mysqlRoot, $storageRoot, $mailpitLogRoot | Out-Null

if (-not (Test-Path (Join-Path $mysqlData "mysql"))) {
  & $mysqld --no-defaults --initialize-insecure --basedir=$($mysqlInstallation.FullName) --datadir=$mysqlData
  if ($LASTEXITCODE -ne 0) { throw "MySQL data directory initialization failed" }
}

$mysqlHealthy = [bool](Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue)
if (-not $mysqlHealthy) {
  Start-Process -FilePath $mysqld `
    -ArgumentList @(
      "--no-defaults",
      "--standalone",
      "--basedir=$($mysqlInstallation.FullName)",
      "--datadir=$mysqlData",
      "--port=3306",
      "--bind-address=127.0.0.1",
      "--character-set-server=utf8mb4",
      "--collation-server=utf8mb4_0900_ai_ci",
      "--default-time-zone=+00:00",
      "--skip-log-bin",
      "--mysqlx=0",
      "--log-error=$mysqlLog",
      "--pid-file=$mysqlPid"
    ) `
    -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(60)
  do {
    Start-Sleep -Milliseconds 500
    & $mysqlAdmin --protocol=TCP --host=127.0.0.1 --port=3306 --user=root ping --silent *> $null
    $mysqlHealthy = $LASTEXITCODE -eq 0
  } until ($mysqlHealthy -or (Get-Date) -gt $deadline)
}
if (-not $mysqlHealthy) { throw "MySQL did not become healthy; inspect $mysqlLog" }

& $mysql --protocol=TCP --host=127.0.0.1 --port=3306 --user=root --execute="CREATE DATABASE IF NOT EXISTS lexnepal CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; CREATE DATABASE IF NOT EXISTS lexnepal_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; CREATE DATABASE IF NOT EXISTS lexnepal_restore_drill CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; CREATE USER IF NOT EXISTS 'lexnepal'@'127.0.0.1' IDENTIFIED BY 'lexnepal_local_dev'; CREATE USER IF NOT EXISTS 'lexnepal'@'localhost' IDENTIFIED BY 'lexnepal_local_dev'; ALTER USER 'lexnepal'@'127.0.0.1' IDENTIFIED BY 'lexnepal_local_dev'; ALTER USER 'lexnepal'@'localhost' IDENTIFIED BY 'lexnepal_local_dev'; GRANT ALL PRIVILEGES ON lexnepal.* TO 'lexnepal'@'127.0.0.1'; GRANT ALL PRIVILEGES ON lexnepal_test.* TO 'lexnepal'@'127.0.0.1'; GRANT ALL PRIVILEGES ON lexnepal_restore_drill.* TO 'lexnepal'@'127.0.0.1'; GRANT ALL PRIVILEGES ON lexnepal.* TO 'lexnepal'@'localhost'; GRANT ALL PRIVILEGES ON lexnepal_test.* TO 'lexnepal'@'localhost'; GRANT ALL PRIVILEGES ON lexnepal_restore_drill.* TO 'lexnepal'@'localhost'; FLUSH PRIVILEGES;"
if ($LASTEXITCODE -ne 0) { throw "LexNepal MySQL database/user provisioning failed" }

$localClamAvRequired = $true
if ($env:LEXNEPAL_SKIP_LOCAL_CLAMAV -eq "1") {
  $localClamAvRequired = $false
} elseif ($env:CLAMAV_HOST -and $env:CLAMAV_HOST -ne "127.0.0.1") {
  $localClamAvRequired = $false
} elseif ($env:CLAMAV_PORT -and $env:CLAMAV_PORT -ne "3310") {
  $localClamAvRequired = $false
}

$clamAvHealthy = [bool](Get-NetTCPConnection -LocalPort 3310 -State Listen -ErrorAction SilentlyContinue)
if ($localClamAvRequired -and -not $clamAvHealthy) {
  $clamAvBin = "C:\Program Files\ClamAV"
  $clamd = Join-Path $clamAvBin "clamd.exe"
  $freshclam = Join-Path $clamAvBin "freshclam.exe"
  if (-not (Test-Path $clamd) -or -not (Test-Path $freshclam)) {
    Write-Warning "ClamAV binaries not found; skipping local ClamAV. Install ClamAV or set LEXNEPAL_SKIP_LOCAL_CLAMAV=1 to suppress this warning."
    $localClamAvRequired = $false
  } else {
    New-Item -ItemType Directory -Force -Path $clamAvDatabase, $clamAvLogRoot | Out-Null
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

    Start-Process -FilePath $clamd `
      -ArgumentList @("--config-file=$clamdConfig") `
      -WorkingDirectory $clamAvBin `
      -WindowStyle Hidden
    $deadline = (Get-Date).AddSeconds(60)
    do {
      Start-Sleep -Milliseconds 500
      $clamAvHealthy = [bool](Get-NetTCPConnection -LocalPort 3310 -State Listen -ErrorAction SilentlyContinue)
    } until ($clamAvHealthy -or (Get-Date) -gt $deadline)
    if (-not $clamAvHealthy) { throw "ClamAV did not become healthy; inspect $clamdLogPath" }
  }
}

$projectMailpit = Join-Path $mailpitRoot "mailpit.exe"
$pathMailpit = Get-Command "mailpit.exe" -ErrorAction SilentlyContinue
$wingetMailpit = Get-ChildItem (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages") `
  -Directory -Filter "axllent.mailpit_*" -ErrorAction SilentlyContinue |
  ForEach-Object { Get-ChildItem $_.FullName -File -Filter "mailpit.exe" -ErrorAction SilentlyContinue } |
  Select-Object -First 1
$mailpit = if (Test-Path $projectMailpit) {
  $projectMailpit
} elseif ($pathMailpit) {
  $pathMailpit.Source
} elseif ($wingetMailpit) {
  $wingetMailpit.FullName
} else {
  throw "Mailpit is not installed; install axllent.mailpit with winget"
}
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

Write-Output "MySQL:       ready at 127.0.0.1:3306 (database: lexnepal)"
Write-Output "Storage:   local filesystem at $storageRoot"
if ($localClamAvRequired) {
  Write-Output "ClamAV:      ready at 127.0.0.1:3310"
} elseif ($env:CLAMAV_HOST -and $env:CLAMAV_HOST -ne "127.0.0.1") {
  $clamAvExternalPort = if ($env:CLAMAV_PORT) { $env:CLAMAV_PORT } else { "3310" }
  Write-Output "ClamAV:      external ($($env:CLAMAV_HOST):$clamAvExternalPort)"
} else {
  Write-Output "ClamAV:      skipped (not installed; set LEXNEPAL_SKIP_LOCAL_CLAMAV=1 to silence)"
}
Write-Output "Mailpit SMTP: ready at 127.0.0.1:1025"
Write-Output "Mailpit UI:   http://127.0.0.1:8025"
Write-Output "Runtime data: $runtimeRoot"
