#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNTIME_ROOT="${LEXNEPAL_RUNTIME_ROOT:-$ROOT_DIR/.local/runtime}"
CLAMAV_ROOT="$RUNTIME_ROOT/ClamAV"
CLAMAV_DATABASE="$CLAMAV_ROOT/database"
CLAMAV_LOG_ROOT="$CLAMAV_ROOT/logs"
FRESHCLAM_CONFIG="$CLAMAV_ROOT/freshclam.conf"

command -v freshclam >/dev/null 2>&1 || {
  printf 'freshclam is not available. Install ClamAV with your OS package manager, Homebrew, or a user-local binary.\n' >&2
  exit 1
}

mkdir -p "$CLAMAV_DATABASE" "$CLAMAV_LOG_ROOT"
sed \
  -e "s#__DATABASE_DIRECTORY__#$CLAMAV_DATABASE#g" \
  -e "s#__FRESHCLAM_LOG__#$CLAMAV_LOG_ROOT/freshclam.log#g" \
  "$ROOT_DIR/config/local/clamav/freshclam.conf.template" > "$FRESHCLAM_CONFIG"

freshclam --config-file="$FRESHCLAM_CONFIG"
printf 'ClamAV signatures are current. Restart local infrastructure to reload them.\n'
