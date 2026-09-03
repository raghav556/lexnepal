#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  printf '[lexnepal-backup] ERROR: .env.local missing\n' >&2
  exit 1
fi

database_url=""
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line#"${line%%[![:space:]]*}"}"
  [[ "$line" == DATABASE_URL=* ]] && { database_url="${line#DATABASE_URL=}"; break; }
done < "$ENV_FILE"

if [[ -z "$database_url" ]]; then
  printf '[lexnepal-backup] ERROR: DATABASE_URL is missing from .env.local\n' >&2
  exit 1
fi

if [[ "$database_url" != mysql://* ]]; then
  printf '[lexnepal-backup] ERROR: DATABASE_URL must use mysql://\n' >&2
  exit 1
fi

url_no_proto="${database_url#mysql://}"
url_userpass="${url_no_proto%%@*}"
db_user="${url_userpass%%:*}"
db_pass="${url_userpass#*:}"
url_hostdb="${url_no_proto#*@}"
url_hostport="${url_hostdb%%/*}"
db_host="${url_hostport%%:*}"
db_port="${url_hostport#*:}"
db_name="${url_hostdb#*/}"
db_name="${db_name%%\?*}"

# Default port if not specified
[[ "$db_host" == *:* ]] || db_port="3306"

command -v mysqldump >/dev/null 2>&1 || {
  printf '[lexnepal-backup] ERROR: mysqldump is not available in PATH\n' >&2
  exit 1
}

backup_root="/tmp/lexnepal/backups"
mkdir -p "$backup_root"

stamp="$(date +%Y%m%d-%H%M%S)"
out_file="$backup_root/lexnepal-$stamp.sql"

export MYSQL_PWD="$db_pass"
if mysqldump --protocol=TCP --host="$db_host" --port="$db_port" --user="$db_user" \
  --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF \
  --result-file="$out_file" "$db_name"; then
  :
else
  exit_code=$?
  unset MYSQL_PWD
  printf '[lexnepal-backup] ERROR: mysqldump failed with exit %d\n' "$exit_code" >&2
  exit "$exit_code"
fi
unset MYSQL_PWD

bytes=$(stat -c%s "$out_file" 2>/dev/null || stat -f%z "$out_file" 2>/dev/null || echo 0)
meta_path="$backup_root/lexnepal-$stamp.json"
cat > "$meta_path" <<EOF
{
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "database": "$db_name",
  "host": "$db_host",
  "port": "$db_port",
  "file": "$out_file",
  "bytes": $bytes
}
EOF
printf '%s\n' "$(cat "$meta_path")"
printf '[lexnepal-backup] Backup OK: %s\n' "$out_file"
