#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNTIME_ROOT="${LEXNEPAL_RUNTIME_ROOT:-$ROOT_DIR/.local/runtime}"
MYSQL_ROOT="$RUNTIME_ROOT/MySQL"
MYSQL_DATA="$MYSQL_ROOT/data"
MYSQL_LOG="$MYSQL_ROOT/mysql.err.log"
MYSQL_PID="$MYSQL_ROOT/mysql.pid"
MYSQL_SOCKET="$MYSQL_ROOT/mysql.sock"
STORAGE_ROOT="$ROOT_DIR/.local/storage"
CLAMAV_ROOT="$RUNTIME_ROOT/ClamAV"
CLAMAV_DATABASE="$CLAMAV_ROOT/database"
CLAMAV_LOG_ROOT="$CLAMAV_ROOT/logs"
CLAMAV_PID="$CLAMAV_ROOT/clamd.pid"
MAILPIT_ROOT="$RUNTIME_ROOT/Mailpit"
MAILPIT_DATA="$MAILPIT_ROOT/mailpit.db"
MAILPIT_LOG_ROOT="$MAILPIT_ROOT/logs"
MAILPIT_PID="$MAILPIT_ROOT/mailpit.pid"

log() {
  printf '[lexnepal-local-infra] %s\n' "$*"
}

die() {
  printf '[lexnepal-local-infra] ERROR: %s\n' "$*" >&2
  exit 1
}

need_bin() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is not available. Install it with your OS package manager, Homebrew, or a user-local binary; this script will not use sudo/apt."
}

load_env_file_defaults() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$line" || "$line" == \#* || "$line" != *=* ]] && continue
    local key="${line%%=*}"
    local value="${line#*=}"
    key="${key%"${key##*[![:space:]]}"}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    if [[ -z "${!key+x}" ]]; then
      value="${value%"${value##*[![:space:]]}"}"
      if [[ ( "$value" == \"*\" && "$value" == *\" ) || ( "$value" == \'*\' && "$value" == *\' ) ]]; then
        value="${value:1:${#value}-2}"
      fi
      export "$key=$value"
    fi
  done < "$file"
}

port_open() {
  node -e "const net=require('node:net'); const socket=net.createConnection({host:'127.0.0.1',port:Number(process.argv[1])}); socket.setTimeout(500); socket.on('connect',()=>process.exit(0)); socket.on('timeout',()=>process.exit(1)); socket.on('error',()=>process.exit(1));" "$1" >/dev/null 2>&1
}

wait_for_port() {
  local port="$1"
  local name="$2"
  local deadline=$((SECONDS + ${3:-60}))
  until port_open "$port"; do
    (( SECONDS < deadline )) || die "$name did not become healthy on 127.0.0.1:$port"
    sleep 0.5
  done
}

mkdir -p "$MYSQL_ROOT" "$STORAGE_ROOT" "$CLAMAV_DATABASE" "$CLAMAV_LOG_ROOT" "$MAILPIT_LOG_ROOT"

load_env_file_defaults "$ROOT_DIR/.env.local"
load_env_file_defaults "$ROOT_DIR/.env.example"

need_bin mysqld
need_bin mysql
need_bin mysqladmin

if [[ ! -d "$MYSQL_DATA/mysql" ]]; then
  log "Initializing local MySQL data directory at $MYSQL_DATA"
  if [[ -d "$MYSQL_DATA" ]] && ! find "$MYSQL_DATA" -mindepth 1 -print -quit | grep -q .; then
    rmdir "$MYSQL_DATA"
  fi
  if mysqld --no-defaults --initialize-insecure --datadir="$MYSQL_DATA" >/dev/null 2>"$MYSQL_LOG"; then
    :
  elif command -v mysql_install_db >/dev/null 2>&1; then
    mysql_install_db --datadir="$MYSQL_DATA" --auth-root-authentication-method=normal >>"$MYSQL_LOG" 2>&1
  else
    if grep -Eq "OS errno 13|Permission denied" "$MYSQL_LOG" 2>/dev/null; then
      die "MySQL initialization failed because $(command -v mysqld) cannot create a user-owned datadir. Use a user-local MySQL binary, Docker, or an already-running compatible MySQL service. Inspect $MYSQL_LOG"
    fi
    die "MySQL initialization failed; inspect $MYSQL_LOG"
  fi
fi

if ! port_open 3307; then
  log "Starting local MySQL on 127.0.0.1:3307"
  mysqld \
    --no-defaults \
    --datadir="$MYSQL_DATA" \
    --port=3307 \
    --socket="$MYSQL_SOCKET" \
    --bind-address=127.0.0.1 \
    --character-set-server=utf8mb4 \
    --collation-server=utf8mb4_0900_ai_ci \
    --default-time-zone=+00:00 \
    --skip-log-bin \
    --mysqlx=0 \
    --log-error="$MYSQL_LOG" \
    --pid-file="$MYSQL_PID" \
    --daemonize >/dev/null 2>>"$MYSQL_LOG" || die "MySQL failed to start; inspect $MYSQL_LOG"
  wait_for_port 3307 MySQL 60
fi

mysql --protocol=TCP --host=127.0.0.1 --port=3307 --user=root --execute="CREATE DATABASE IF NOT EXISTS lexnepal CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; CREATE DATABASE IF NOT EXISTS lexnepal_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; CREATE DATABASE IF NOT EXISTS lexnepal_restore_drill CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; CREATE USER IF NOT EXISTS 'lexnepal'@'127.0.0.1' IDENTIFIED BY 'lexnepal_local_dev'; CREATE USER IF NOT EXISTS 'lexnepal'@'localhost' IDENTIFIED BY 'lexnepal_local_dev'; ALTER USER 'lexnepal'@'127.0.0.1' IDENTIFIED BY 'lexnepal_local_dev'; ALTER USER 'lexnepal'@'localhost' IDENTIFIED BY 'lexnepal_local_dev'; GRANT ALL PRIVILEGES ON lexnepal.* TO 'lexnepal'@'127.0.0.1'; GRANT ALL PRIVILEGES ON lexnepal_test.* TO 'lexnepal'@'127.0.0.1'; GRANT ALL PRIVILEGES ON lexnepal_restore_drill.* TO 'lexnepal'@'127.0.0.1'; GRANT ALL PRIVILEGES ON lexnepal.* TO 'lexnepal'@'localhost'; GRANT ALL PRIVILEGES ON lexnepal_test.* TO 'lexnepal'@'localhost'; GRANT ALL PRIVILEGES ON lexnepal_restore_drill.* TO 'lexnepal'@'localhost'; FLUSH PRIVILEGES;" >/dev/null ||
  die "LexNepal MySQL database/user provisioning failed"

LOCAL_CLAMAV_REQUIRED=1
if [[ "${LEXNEPAL_SKIP_LOCAL_CLAMAV:-0}" == "1" ]]; then
  LOCAL_CLAMAV_REQUIRED=0
elif [[ "${CLAMAV_HOST:-127.0.0.1}" != "127.0.0.1" || "${CLAMAV_PORT:-3310}" != "3310" ]]; then
  LOCAL_CLAMAV_REQUIRED=0
fi

if [[ "$LOCAL_CLAMAV_REQUIRED" == "1" ]] && ! port_open 3310; then
  if ! command -v clamd >/dev/null 2>&1 || ! command -v freshclam >/dev/null 2>&1; then
    log "ClamAV binaries (clamd, freshclam) not found in PATH; skipping local ClamAV. Install ClamAV or set LEXNEPAL_SKIP_LOCAL_CLAMAV=1 to suppress this warning."
    LOCAL_CLAMAV_REQUIRED=0
  else
    CLAMD_CONFIG="$CLAMAV_ROOT/clamd.conf"
    FRESHCLAM_CONFIG="$CLAMAV_ROOT/freshclam.conf"
    sed \
      -e "s#__DATABASE_DIRECTORY__#$CLAMAV_DATABASE#g" \
      -e "s#__CLAMD_LOG__#$CLAMAV_LOG_ROOT/clamd.log#g" \
      "$ROOT_DIR/config/local/clamav/clamd.conf.template" > "$CLAMD_CONFIG"
    sed \
      -e "s#__DATABASE_DIRECTORY__#$CLAMAV_DATABASE#g" \
      -e "s#__FRESHCLAM_LOG__#$CLAMAV_LOG_ROOT/freshclam.log#g" \
      "$ROOT_DIR/config/local/clamav/freshclam.conf.template" > "$FRESHCLAM_CONFIG"
    if ! find "$CLAMAV_DATABASE" -maxdepth 1 -type f \( -name '*.cvd' -o -name '*.cld' \) | grep -q .; then
      log "Downloading ClamAV signatures"
      freshclam --config-file="$FRESHCLAM_CONFIG" || die "ClamAV signature download failed; inspect $CLAMAV_LOG_ROOT/freshclam.log"
    fi
    log "Starting ClamAV on 127.0.0.1:3310"
    clamd --config-file="$CLAMD_CONFIG" &
    echo "$!" > "$CLAMAV_PID"
    wait_for_port 3310 ClamAV 60
  fi
elif [[ "$LOCAL_CLAMAV_REQUIRED" == "0" ]]; then
  log "Skipping local ClamAV bootstrap because CLAMAV_HOST/CLAMAV_PORT or LEXNEPAL_SKIP_LOCAL_CLAMAV points outside the default local service"
fi

LOCAL_MAILPIT_REQUIRED=1
if [[ "${LEXNEPAL_SKIP_LOCAL_MAILPIT:-0}" == "1" ]]; then
  LOCAL_MAILPIT_REQUIRED=0
elif [[ "${SMTP_HOST:-127.0.0.1}" != "127.0.0.1" || "${SMTP_PORT:-1025}" != "1025" ]]; then
  LOCAL_MAILPIT_REQUIRED=0
fi

if [[ "$LOCAL_MAILPIT_REQUIRED" == "1" ]] && ! port_open 1025; then
  need_bin mailpit
  log "Starting Mailpit on 127.0.0.1:1025 and 127.0.0.1:8025"
  mailpit --smtp 127.0.0.1:1025 --listen 127.0.0.1:8025 --database "$MAILPIT_DATA" --max 500 >"$MAILPIT_LOG_ROOT/server.out.log" 2>"$MAILPIT_LOG_ROOT/server.err.log" &
  echo "$!" > "$MAILPIT_PID"
  wait_for_port 1025 Mailpit 30
elif [[ "$LOCAL_MAILPIT_REQUIRED" == "0" ]]; then
  log "Skipping local Mailpit bootstrap because SMTP_HOST/SMTP_PORT or LEXNEPAL_SKIP_LOCAL_MAILPIT points outside the default local service"
fi

printf 'MySQL:        ready at 127.0.0.1:3307 (database: lexnepal)\n'
printf 'Storage:      local filesystem at %s\n' "$STORAGE_ROOT"
if [[ "$LOCAL_CLAMAV_REQUIRED" == "1" ]]; then
  printf 'ClamAV:       ready at 127.0.0.1:3310\n'
elif [[ -n "${CLAMAV_HOST:-}" && "${CLAMAV_HOST:-127.0.0.1}" != "127.0.0.1" ]]; then
  printf 'ClamAV:       external (%s:%s)\n' "$CLAMAV_HOST" "${CLAMAV_PORT:-3310}"
else
  printf 'ClamAV:       skipped (not installed; set LEXNEPAL_SKIP_LOCAL_CLAMAV=1 to silence)\n'
fi
if [[ "$LOCAL_MAILPIT_REQUIRED" == "1" ]]; then
  printf 'Mailpit SMTP: ready at 127.0.0.1:1025\n'
  printf 'Mailpit UI:   http://127.0.0.1:8025\n'
else
  printf 'Mailpit SMTP: external/skipped (%s:%s)\n' "${SMTP_HOST:-unset}" "${SMTP_PORT:-unset}"
fi
printf 'Runtime data: %s\n' "$RUNTIME_ROOT"
