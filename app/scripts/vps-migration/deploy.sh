#!/usr/bin/env bash
# Deploy FlixCam to a given environment (production | staging | dev).
# Run on VPS: /home/flixcam/scripts/deploy.sh <environment>
# Optional: pass --build to run npm build and prisma migrate (default: yes for production).
# For single-app: copy paths.config.sh to scripts/ and set PRODUCTION_APP_PATH.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$SCRIPT_DIR/paths.config.sh" ]] && . "$SCRIPT_DIR/paths.config.sh"
HOME_FLIXCAM="${HOME_FLIXCAM:-/home/flixcam}"
ENV="${1:-production}"
DO_BUILD="${2:-}"

case "$ENV" in
  production|staging|dev) ;;
  *)
    echo "Usage: $0 <production|staging|dev> [--build]"
    exit 1
    ;;
esac

if [[ "$ENV" = "production" ]]; then
  # Resolve production app dir with safe fallback order:
  # 1) PRODUCTION_APP_PATH (from paths.config.sh or env)
  # 2) default single-app layout at public_html/app
  if [[ -n "${PRODUCTION_APP_PATH:-}" ]] && [[ -d "${PRODUCTION_APP_PATH}" ]]; then
    APP_DIR="$PRODUCTION_APP_PATH"
  elif [[ -d "$HOME_FLIXCAM/public_html/app" ]]; then
    APP_DIR="$HOME_FLIXCAM/public_html/app"
  else
    echo "ERROR: Production app dir not found."
    echo "Set PRODUCTION_APP_PATH or create $HOME_FLIXCAM/public_html/app"
    exit 1
  fi
else
  APP_DIR="$HOME_FLIXCAM/apps/$ENV/flixcam"
fi
if [[ ! -d "$APP_DIR" ]]; then
  echo "ERROR: App dir not found: $APP_DIR"
  exit 1
fi

echo "==> Deploying FlixCam [$ENV] at $APP_DIR"

# If this is a git work tree, pull latest (when deploy is triggered by push or manually)
if [[ -d "$APP_DIR/.git" ]]; then
  (cd "$APP_DIR" && git pull origin main 2>/dev/null) || true
fi

cd "$APP_DIR"

if [[ "$ENV" = "production" ]] && [[ ! -e "$APP_DIR/.env" ]]; then
  if [[ -f "$HOME_FLIXCAM/config/.env.production" ]]; then
    ln -sfn "$HOME_FLIXCAM/config/.env.production" "$APP_DIR/.env"
    echo "==> Linked $APP_DIR/.env -> $HOME_FLIXCAM/config/.env.production"
  else
    echo "ERROR: Missing $APP_DIR/.env and $HOME_FLIXCAM/config/.env.production"
    exit 1
  fi
fi

# Build: always for production; for staging/dev only when --build is passed
if [[ "$ENV" = "production" ]] || [[ "$DO_BUILD" = "--build" ]]; then
  echo "==> Installing dependencies (including dev for build)..."
  npm ci 2>/dev/null || npm install
  echo "==> Running Prisma migrate..."
  npx prisma migrate deploy
  echo "==> Building..."
  # Turbopack fails if storage/uploads is a symlink outside project; use empty dir for build then restore
  UPLOADS_LINK=
  if [[ -L "$APP_DIR/storage/uploads" ]]; then
    UPLOADS_LINK="$(readlink -f "$APP_DIR/storage/uploads")"
    rm -f "$APP_DIR/storage/uploads"
    mkdir -p "$APP_DIR/storage/uploads"
  fi
  npm run build
  BUILD_EXIT=$?
  if [[ -n "$UPLOADS_LINK" ]]; then
    rm -rf "$APP_DIR/storage/uploads"
    ln -sf "$UPLOADS_LINK" "$APP_DIR/storage/uploads"
  fi
  [[ $BUILD_EXIT -ne 0 ]] && exit $BUILD_EXIT
fi

echo "==> Restarting PM2 process..."
if [[ "$ENV" = "production" ]]; then
  pm2 restart flixcam-production --update-env 2>/dev/null || pm2 start npm --name flixcam-production -- run start
else
  pm2 restart "flixcam-$ENV" 2>/dev/null || pm2 start npm --name "flixcam-$ENV" -- run start
fi

echo "==> Done. FlixCam [$ENV] deployed."
