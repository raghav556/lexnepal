$ErrorActionPreference = "Stop"

$config = Join-Path $env:LOCALAPPDATA "LexNepal\ClamAV\freshclam.conf"
if (-not (Test-Path $config)) {
  throw "ClamAV is not initialized; run npm run local:infra:start first"
}

& "C:\Program Files\ClamAV\freshclam.exe" --config-file=$config
if ($LASTEXITCODE -ne 0) { throw "ClamAV signature update failed" }

Write-Output "ClamAV signatures are current. Restart local infrastructure to reload them."
