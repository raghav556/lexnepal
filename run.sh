#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

MODE="${1:-dev}"
if [[ "$MODE" == "" ]]; then MODE="dev"; fi

APP_PORT="${PORT:-3001}"
NPM_CACHE_DIR="${NPM_CONFIG_CACHE:-$ROOT_DIR/.local/npm-cache}"

log() {
  printf '[lexnepal] %s\n' "$*"
}

die() {
  printf '[lexnepal] ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'USAGE'
Usage:
  ./run.sh              Start local development on http://localhost:3001
  ./run.sh dev          Install, prepare .env.local if missing, then run npm run dev
  ./run.sh prod         Install, validate, build standalone, then run the production artifact
  ./run.sh install      Install dependencies and prepare .env.local if missing
  ./run.sh verify       Run the repository's fast gates
  ./run.sh --help       Show this help

Notes:
  - Reads Node from .nvmrc and npm from package.json packageManager.
  - Uses npm ci when package-lock.json exists.
  - Never overwrites .env.local and never deletes local LexNepal infrastructure data.
USAGE
}

load_nvm() {
  if command -v nvm >/dev/null 2>&1; then return 0; fi
  local nvm_dir="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "$nvm_dir/nvm.sh" ]]; then
    # shellcheck disable=SC1090
    . "$nvm_dir/nvm.sh"
  fi
}

required_node_major() {
  [[ -f .nvmrc ]] || die ".nvmrc is missing; LexNepal pins its runtime there."
  tr -d '[:space:]' < .nvmrc | sed 's/^v//' | cut -d. -f1
}

package_manager_npm_version() {
  node -e "const pm=require('./package.json').packageManager||''; const m=pm.match(/^npm@(.+)$/); if (m) process.stdout.write(m[1]);"
}

select_node() {
  local required_major
  required_major="$(required_node_major)"
  load_nvm
  if command -v nvm >/dev/null 2>&1; then
    log "Selecting Node from .nvmrc"
    nvm use >/dev/null || die "Node $required_major is not installed in nvm. Install it with: nvm install"
  fi
  command -v node >/dev/null 2>&1 || die "node is not available"
  local current_major
  current_major="$(node -p "process.versions.node.split('.')[0]")"
  [[ "$current_major" == "$required_major" ]] ||
    die "Node major $required_major is required by .nvmrc, but current node is $(node -v)."
}

validate_npm() {
  command -v npm >/dev/null 2>&1 || die "npm is not available"
  local required_npm
  required_npm="$(package_manager_npm_version)"
  if [[ -n "$required_npm" ]]; then
    local current_npm
    current_npm="$(npm -v)"
    [[ "$current_npm" == "$required_npm" ]] ||
      die "npm $required_npm is required by package.json packageManager, but current npm is $current_npm."
  fi
}

install_dependencies() {
  mkdir -p "$NPM_CACHE_DIR"
  if [[ -f package-lock.json ]]; then
    log "Installing dependencies with npm ci"
    npm ci --cache "$NPM_CACHE_DIR"
  else
    log "Installing dependencies with npm install"
    npm install --cache "$NPM_CACHE_DIR"
  fi
}

prepare_local_env() {
  if [[ -f .env.local ]]; then
    log ".env.local already exists; leaving it untouched"
    return 0
  fi
  [[ -f .env.example ]] || return 0
  cp .env.example .env.local
  log "Created .env.local from .env.example; set BETTER_AUTH_SECRET before relying on auth flows"
}

verify_optional_local_infra() {
  if [[ "${LEXNEPAL_VERIFY_LOCAL_INFRA:-0}" != "1" ]]; then return 0; fi
  log "Verifying local storage, ClamAV, and job infrastructure"
  npm run storage:verify-local
  npm run storage:verify-clamav
  npm run jobs:verify-local
}

verify_fast_gates() {
  npm run format:check
  npm run lint
  npm run typecheck
  npm run test
  load_env_file_defaults ".env.example"
  ensure_build_time_auth_secret
  npm run build
  assert_standalone
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

ensure_build_time_auth_secret() {
  if [[ -n "${BETTER_AUTH_SECRET:-}" ]]; then return 0; fi
  if [[ -f .env.local ]] && grep -Eq '^BETTER_AUTH_SECRET=.{32,}' .env.local; then return 0; fi
  export BETTER_AUTH_SECRET="lexnepal-local-build-placeholder-32-chars"
  log "Using a temporary build-time BETTER_AUTH_SECRET for local verification"
}

assert_standalone() {
  [[ -f .next/standalone/server.js ]] || die "Missing .next/standalone/server.js after build"
  [[ -d .next/static ]] || die "Missing .next/static after build"
}

prepare_standalone_runtime() {
  assert_standalone
  cp runtime-env.cjs app.cjs .next/standalone/
  if [[ -d public ]]; then
    mkdir -p .next/standalone/public
    cp -R public/. .next/standalone/public/
  fi
  mkdir -p .next/standalone/.next/static
  cp -R .next/static/. .next/standalone/.next/static/
}

case "$MODE" in
  dev)
    select_node
    validate_npm
    prepare_local_env
    install_dependencies
    verify_optional_local_infra
    log "Starting Next.js development server on http://localhost:$APP_PORT"
    npm run dev
    ;;
  prod)
    select_node
    validate_npm
    install_dependencies
    npm run verify:auth-production
    npm run db:integrity
    npm run db:check
    npm run build
    prepare_standalone_runtime
    log "Starting standalone production artifact on port $APP_PORT"
    NODE_ENV=production PORT="$APP_PORT" node .next/standalone/app.cjs
    ;;
  install)
    select_node
    validate_npm
    prepare_local_env
    install_dependencies
    ;;
  verify)
    select_node
    validate_npm
    install_dependencies
    verify_fast_gates
    ;;
  --help|-h|help)
    usage
    ;;
  *)
    usage >&2
    die "Unknown mode: $MODE"
    ;;
esac
