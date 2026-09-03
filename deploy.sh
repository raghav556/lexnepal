#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

DEFAULT_DEPLOY_ENV_FILE="$HOME/.config/lexnepal/deploy.env"
DEPLOY_ENV_FILE="${DEPLOY_ENV_FILE:-$DEFAULT_DEPLOY_ENV_FILE}"
MODE="${1:-deploy}"

ARCHIVE_PATH=""
REMOTE_ARCHIVE=""
REMOTE_RELEASE_DIR=""

log() {
  printf '[lexnepal-deploy] %s\n' "$*"
}

die() {
  printf '[lexnepal-deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'USAGE'
Usage:
  ./deploy.sh              Build and deploy after loading ~/.config/lexnepal/deploy.env
  ./deploy.sh --preflight  Validate local deploy readiness without contacting production
  ./deploy.sh --rollback   Run REMOTE_ROLLBACK_COMMAND on the configured server
  ./deploy.sh --help       Show this help

Deployment is deliberately manual/operator-controlled. Production secrets belong in cPanel,
process-manager environment, .env.runtime on the server, or DEPLOY_ENV_FILE outside this repo.
USAGE
}

reject_repo_env_file() {
  local candidate="$1"
  [[ -n "$candidate" ]] || return 0
  local dir
  dir="$(cd "$(dirname "$candidate")" 2>/dev/null && pwd || true)"
  if [[ -n "$dir" && "$dir" == "$ROOT_DIR"* ]]; then
    die "Refusing DEPLOY_ENV_FILE inside repository: $candidate"
  fi
}

load_deploy_env() {
  reject_repo_env_file "$DEPLOY_ENV_FILE"
  if [[ -f "$DEPLOY_ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    set -a
    . "$DEPLOY_ENV_FILE"
    set +a
    log "Loaded deployment config from $DEPLOY_ENV_FILE"
  else
    [[ "$MODE" == "--preflight" ]] || die "Missing deployment config: $DEPLOY_ENV_FILE"
    log "Deployment config not found at $DEPLOY_ENV_FILE; preflight will report this as an action item"
  fi
}

apply_defaults() {
  : "${SERVER:=deploy@example.com}"
  : "${SSH_PORT:=22}"
  : "${APP_PATH:=/home/USERNAME/apps/lexnepal}"
  : "${PUBLIC_HTML_PATH:=/home/USERNAME/public_html}"
  : "${BUILD_OUTPUT_DIR:=.next}"
  : "${STANDALONE_DIR:=.next/standalone}"
  : "${REMOTE_RESTART_MODE:=passenger}"
  : "${PM2_APP_NAME:=lexnepal}"
  : "${REMOTE_NODE_BIN:=node}"
  : "${REMOTE_NODE_BIN_DIR:=}"
  : "${RUNTIME_ENV_PATH:=$APP_PATH/current/.env.runtime}"
  : "${READINESS_URL:=}"
  : "${SMOKE_BASE_URL:=}"
  : "${WRITE_RUNTIME_ENV:=0}"
  : "${DEPLOY_PREFLIGHT_ONLY:=0}"
  : "${REMOTE_BACKUP_COMMAND:=}"
  : "${REMOTE_MIGRATION_COMMAND:=}"
  : "${REMOTE_ROLLBACK_COMMAND:=}"
  : "${RUNTIME_ENV_SOURCE:=}"
  : "${MIRROR_STATIC_TO_PUBLIC_HTML:=0}"
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
  [[ -f .nvmrc ]] || die ".nvmrc is missing"
  tr -d '[:space:]' < .nvmrc | sed 's/^v//' | cut -d. -f1
}

package_manager_npm_version() {
  node -e "const pm=require('./package.json').packageManager||''; const m=pm.match(/^npm@(.+)$/); if (m) process.stdout.write(m[1]);"
}

select_node() {
  local required_major
  required_major="$(required_node_major)"
  load_nvm
  if command -v nvm >/dev/null 2>&1; then nvm use >/dev/null || die "Install Node from .nvmrc with: nvm install"; fi
  command -v node >/dev/null 2>&1 || die "node is not available"
  local current_major
  current_major="$(node -p "process.versions.node.split('.')[0]")"
  [[ "$current_major" == "$required_major" ]] ||
    die "Node major $required_major is required, but current node is $(node -v)"
  local required_npm
  required_npm="$(package_manager_npm_version)"
  if [[ -n "$required_npm" && "$(npm -v)" != "$required_npm" ]]; then
    die "npm $required_npm is required, but current npm is $(npm -v)"
  fi
}

install_dependencies() {
  mkdir -p .local/npm-cache
  [[ -f package-lock.json ]] || die "package-lock.json is required for deterministic deployment"
  npm ci --cache "$ROOT_DIR/.local/npm-cache"
}

run_local_gates() {
  npm run format:check
  npm run lint
  npm run typecheck
  npm run test
  npm run db:integrity
  npm run db:check
  prepare_build_database_url
  ensure_build_time_auth_secret
  npm run build
}

prepare_build_database_url() {
  if [[ -n "${BUILD_DATABASE_URL:-}" ]]; then
    export DATABASE_URL="$BUILD_DATABASE_URL"
    return 0
  fi
  if [[ "$MODE" == "--preflight" ]]; then
    export DATABASE_URL="mysql://ethan:ethan@127.0.0.1:3306/dit_lexnepal"
    log "Using local placeholder DATABASE_URL for preflight; set BUILD_DATABASE_URL to opt into DB-backed build data"
    return 0
  fi
  if [[ -n "${DATABASE_URL:-}" ]]; then return 0; fi
  export DATABASE_URL="mysql://ethan:ethan@127.0.0.1:3306/dit_lexnepal"
  log "Using local placeholder DATABASE_URL for build-time config collection"
}

ensure_build_time_auth_secret() {
  if [[ -n "${BETTER_AUTH_SECRET:-}" ]]; then return 0; fi
  if [[ -n "$RUNTIME_ENV_SOURCE" && -f "$RUNTIME_ENV_SOURCE" ]] &&
    grep -Eq '^BETTER_AUTH_SECRET=.{32,}' "$RUNTIME_ENV_SOURCE"; then
    export BETTER_AUTH_SECRET="lexnepal-deploy-build-placeholder-32-chars"
    log "Using a temporary build-time BETTER_AUTH_SECRET; runtime will use host env/.env.runtime"
    return 0
  fi
  export BETTER_AUTH_SECRET="lexnepal-deploy-build-placeholder-32-chars"
  log "Using a temporary build-time BETTER_AUTH_SECRET; configure the real runtime secret before launch"
}

assert_standalone() {
  [[ -f "$STANDALONE_DIR/server.js" ]] || die "Missing $STANDALONE_DIR/server.js"
  [[ -d "$BUILD_OUTPUT_DIR/static" ]] || die "Missing $BUILD_OUTPUT_DIR/static"
}

assert_no_local_env_in_artifact() {
  if find "$STANDALONE_DIR" -name '.env.local' -o -name '.env.runtime' -o -name '.env' | grep -q .; then
    die "A local env file was found in the standalone artifact"
  fi
}

prepare_artifact() {
  assert_standalone
  cp runtime-env.cjs app.cjs "$STANDALONE_DIR/"
  if [[ -d public ]]; then
    mkdir -p "$STANDALONE_DIR/public"
    cp -R public/. "$STANDALONE_DIR/public/"
  fi
  mkdir -p "$STANDALONE_DIR/.next/static"
  cp -R "$BUILD_OUTPUT_DIR/static/." "$STANDALONE_DIR/.next/static/"
  assert_no_local_env_in_artifact
}

write_archive() {
  local stamp
  stamp="$(date +%Y%m%d%H%M%S)"
  ARCHIVE_PATH="$(mktemp "/tmp/lexnepal-standalone-$stamp.XXXXXX.tgz")"
  tar -czf "$ARCHIVE_PATH" -C "$STANDALONE_DIR" .
  REMOTE_ARCHIVE="/tmp/lexnepal-standalone-$stamp.tgz"
  REMOTE_RELEASE_DIR="$APP_PATH/releases/$stamp"
  log "Prepared artifact $ARCHIVE_PATH"
}

run_remote() {
  local command="$1"
  if [[ -n "$REMOTE_NODE_BIN_DIR" ]]; then
    command="export PATH='$REMOTE_NODE_BIN_DIR':\$PATH; $command"
  fi
  # shellcheck disable=SC2086
  $SSH_CMD ssh -o StrictHostKeyChecking=accept-new -p "$SSH_PORT" "$SERVER" "$command"
}

upload_artifact() {
  # shellcheck disable=SC2086
  $SSH_CMD scp -o StrictHostKeyChecking=accept-new -P "$SSH_PORT" "$ARCHIVE_PATH" "$SERVER:$REMOTE_ARCHIVE"
}

write_runtime_env() {
  [[ "$WRITE_RUNTIME_ENV" == "1" ]] || return 0
  [[ -n "$RUNTIME_ENV_SOURCE" ]] || die "WRITE_RUNTIME_ENV=1 requires RUNTIME_ENV_SOURCE"
  reject_repo_env_file "$RUNTIME_ENV_SOURCE"
  # shellcheck disable=SC2086
  $SSH_CMD scp -o StrictHostKeyChecking=accept-new -P "$SSH_PORT" "$RUNTIME_ENV_SOURCE" "$SERVER:$RUNTIME_ENV_PATH"
}

# Resolve the ssh/scp invocation prefix once, before any remote operations.
init_ssh() {
  SSH_CMD=""
}

backup_remote() {
  if [[ -n "$REMOTE_BACKUP_COMMAND" ]]; then
    run_remote "$REMOTE_BACKUP_COMMAND"
    return 0
  fi
  run_remote "mkdir -p '$APP_PATH/backups' '$APP_PATH/releases' && if [ -L '$APP_PATH/current' ]; then cp -a \"\$(readlink -f '$APP_PATH/current')\" '$APP_PATH/backups/previous'; fi"
}

activate_release() {
  run_remote "mkdir -p '$REMOTE_RELEASE_DIR' && tar -xzf '$REMOTE_ARCHIVE' -C '$REMOTE_RELEASE_DIR' && ln -sfn '$REMOTE_RELEASE_DIR' '$APP_PATH/current' && rm -f '$REMOTE_ARCHIVE'"
}

run_migrations() {
  if [[ -z "$REMOTE_MIGRATION_COMMAND" ]]; then
    log "REMOTE_MIGRATION_COMMAND not set; skipping automatic database migration"
    return 0
  fi
  run_remote "$REMOTE_MIGRATION_COMMAND"
}

mirror_static_assets() {
  [[ "$MIRROR_STATIC_TO_PUBLIC_HTML" == "1" ]] || return 0
  run_remote "mkdir -p '$PUBLIC_HTML_PATH/_next/static' && cp -a '$APP_PATH/current/.next/static/.' '$PUBLIC_HTML_PATH/_next/static/' && if [ -d '$APP_PATH/current/public' ]; then cp -a '$APP_PATH/current/public/.' '$PUBLIC_HTML_PATH/'; fi"
}

restart_remote() {
  case "$REMOTE_RESTART_MODE" in
    passenger)
      run_remote "mkdir -p '$APP_PATH/current/tmp' && touch '$APP_PATH/current/tmp/restart.txt'"
      ;;
    pm2)
      run_remote "pm2 reload '$PM2_APP_NAME' || pm2 restart '$PM2_APP_NAME'"
      ;;
    command)
      [[ -n "${REMOTE_RESTART_COMMAND:-}" ]] || die "REMOTE_RESTART_MODE=command requires REMOTE_RESTART_COMMAND"
      run_remote "$REMOTE_RESTART_COMMAND"
      ;;
    none)
      log "REMOTE_RESTART_MODE=none; skipping restart"
      ;;
    *)
      die "Unknown REMOTE_RESTART_MODE=$REMOTE_RESTART_MODE"
      ;;
  esac
}

smoke_check() {
  local url="${READINESS_URL:-}"
  if [[ -z "$url" && -n "$SMOKE_BASE_URL" ]]; then url="${SMOKE_BASE_URL%/}/api/v1/readiness"; fi
  [[ -n "$url" ]] || return 0
  curl -fsS "$url" >/dev/null
}

rollback_remote() {
  [[ -n "$REMOTE_ROLLBACK_COMMAND" ]] || die "REMOTE_ROLLBACK_COMMAND is not configured"
  run_remote "$REMOTE_ROLLBACK_COMMAND"
}

preflight() {
  load_deploy_env
  apply_defaults
  select_node
  install_dependencies
  run_local_gates
  prepare_artifact
  [[ -f "$DEPLOY_ENV_FILE" ]] || die "Create external deploy config at $DEPLOY_ENV_FILE before deployment"
  log "Preflight passed without contacting production"
}

deploy() {
  load_deploy_env
  apply_defaults
  init_ssh
  select_node
  install_dependencies
  run_local_gates
  prepare_artifact
  if [[ "$DEPLOY_PREFLIGHT_ONLY" == "1" ]]; then
    log "DEPLOY_PREFLIGHT_ONLY=1; stopping before remote changes"
    return 0
  fi
  write_archive
  upload_artifact
  backup_remote
  write_runtime_env
  activate_release
  run_migrations
  mirror_static_assets
  restart_remote
  smoke_check
  log "Deployment completed"
}

case "$MODE" in
  --help|-h|help)
    usage
    ;;
  --preflight|preflight)
    MODE="--preflight"
    preflight
    ;;
  --rollback|rollback)
    MODE="--rollback"
    load_deploy_env
    apply_defaults
    init_ssh
    rollback_remote
    ;;
  deploy)
    deploy
    ;;
  *)
    usage >&2
    die "Unknown mode: $MODE"
    ;;
esac
