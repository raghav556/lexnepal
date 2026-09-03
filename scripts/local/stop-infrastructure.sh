#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNTIME_ROOT="${LEXNEPAL_RUNTIME_ROOT:-$ROOT_DIR/.local/runtime}"
MYSQL_ROOT="$RUNTIME_ROOT/MySQL"
MYSQL_PID="$MYSQL_ROOT/mysql.pid"
CLAMAV_PID="$RUNTIME_ROOT/ClamAV/clamd.pid"
MAILPIT_PID="$RUNTIME_ROOT/Mailpit/mailpit.pid"

stop_pid_file() {
  local file="$1"
  local name="$2"
  if [[ -f "$file" ]]; then
    local pid
    pid="$(cat "$file")"
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      printf '%s stopped.\n' "$name"
    fi
    rm -f "$file"
  fi
}

if command -v mysqladmin >/dev/null 2>&1; then
  mysqladmin --protocol=TCP --host=127.0.0.1 --port=3306 --user=root shutdown >/dev/null 2>&1 || true
fi
rm -f "$MYSQL_PID"

stop_pid_file "$CLAMAV_PID" "ClamAV"
stop_pid_file "$MAILPIT_PID" "Mailpit"

printf 'LexNepal local MySQL, ClamAV and Mailpit stop requested.\n'
