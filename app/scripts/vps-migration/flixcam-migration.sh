#!/usr/bin/env bash
# FlixCam VPS migration: restructure to apps/{production,staging,dev} + shared + PM2.
# Run on the VPS as flixcam (or root). Take a snapshot before running.
#
# Usage: ./flixcam-migration.sh [--dry-run]
#   --dry-run  Print actions only, do not modify filesystem.

set -e
DRY_RUN=
[[ "${1:-}" = "--dry-run" ]] && DRY_RUN=1

HOME_FLIXCAM="${HOME_FLIXCAM:-/home/flixcam}"
# Prefer clean path (public_html/app); fallback to old nested path for VPS that haven't migrated yet
if [[ -d "${HOME_FLIXCAM}/public_html/app" ]]; then
  SOURCE_APP="${HOME_FLIXCAM}/public_html/app"
else
  SOURCE_APP="${HOME_FLIXCAM}/public_html/FlixCamFinal 3/FlixCamFinal 3"
fi
BACKUP_ROOT="${BACKUP_ROOT:-/root}"
DATE=$(date +%Y%m%d-%H%M)

run() {
  if [[ -n "$DRY_RUN" ]]; then
    echo "[DRY-RUN] $*"
  else
    "$@"
  fi
}

echo "=== FlixCam VPS Migration ==="
echo "HOME_FLIXCAM=$HOME_FLIXCAM"
echo "SOURCE_APP=$SOURCE_APP"
echo "BACKUP_ROOT=$BACKUP_ROOT"
if [[ -n "$DRY_RUN" ]]; then
  echo "Mode: DRY RUN (no changes)"
fi

if [[ ! -d "$SOURCE_APP" ]]; then
  echo "ERROR: Source app not found at: $SOURCE_APP"
  exit 1
fi

# --- Step 1: Backup ---
echo ""
echo "--- Step 1: Backup ---"
run mkdir -p "$BACKUP_ROOT"
if [[ -z "$DRY_RUN" ]]; then
  tar -czf "${BACKUP_ROOT}/flixcam-home-${DATE}.tar.gz" -C / "$(echo "$HOME_FLIXCAM" | sed 's|^/||')" 2>/dev/null || true
  echo "Created ${BACKUP_ROOT}/flixcam-home-${DATE}.tar.gz"
  if command -v pg_dump &>/dev/null; then
    pg_dump -U postgres flixcam_rent > "${BACKUP_ROOT}/flixcam-db-${DATE}.sql" 2>/dev/null && echo "Created ${BACKUP_ROOT}/flixcam-db-${DATE}.sql" || echo "pg_dump skipped (no access or DB name)"
  fi
fi

# --- Step 2: Create directory structure ---
echo ""
echo "--- Step 2: Create directory structure ---"
run mkdir -p "$HOME_FLIXCAM/apps/production"
run mkdir -p "$HOME_FLIXCAM/apps/staging"
run mkdir -p "$HOME_FLIXCAM/apps/dev"
run mkdir -p "$HOME_FLIXCAM/shared/uploads"
run mkdir -p "$HOME_FLIXCAM/shared/backups/daily"
run mkdir -p "$HOME_FLIXCAM/shared/backups/weekly"
run mkdir -p "$HOME_FLIXCAM/shared/ssl"
run mkdir -p "$HOME_FLIXCAM/shared/nginx"
run mkdir -p "$HOME_FLIXCAM/config"
run mkdir -p "$HOME_FLIXCAM/logs/production"
run mkdir -p "$HOME_FLIXCAM/logs/staging"
run mkdir -p "$HOME_FLIXCAM/logs/dev"
run mkdir -p "$HOME_FLIXCAM/scripts"
run mkdir -p "$HOME_FLIXCAM/pm2"
run mkdir -p "$HOME_FLIXCAM/repos"

# --- Step 3: Copy app to production (no spaces) ---
echo ""
echo "--- Step 3: Copy app to apps/production/flixcam ---"
PROD_APP="${HOME_FLIXCAM}/apps/production/flixcam"
if [[ -d "$PROD_APP" ]]; then
  run mv "$PROD_APP" "${PROD_APP}.old.${DATE}"
fi
run cp -a "$SOURCE_APP" "$PROD_APP"
echo "Copied to $PROD_APP"

# Remove dev-only / noisy dirs from production copy
for dir in .cursor .history __MACOSX .git; do
  if [[ -d "$PROD_APP/$dir" ]] && [[ -z "$DRY_RUN" ]]; then
    rm -rf "$PROD_APP/$dir"
    echo "Removed $PROD_APP/$dir"
  fi
done
# Remove nested public_html inside app if present
if [[ -d "$PROD_APP/public_html" ]] && [[ -z "$DRY_RUN" ]]; then
  rm -rf "$PROD_APP/public_html"
  echo "Removed $PROD_APP/public_html"
fi

# --- Step 4: Copy to staging and dev ---
echo ""
echo "--- Step 4: Copy app to staging and dev ---"
for env in staging dev; do
  DEST="${HOME_FLIXCAM}/apps/${env}/flixcam"
  if [[ -d "$DEST" ]]; then
    run rm -rf "$DEST"
  fi
  run cp -a "$PROD_APP" "$DEST"
  if [[ -d "$DEST/.next" ]] && [[ -z "$DRY_RUN" ]]; then
    rm -rf "$DEST/.next"
  fi
  echo "Created $DEST"
done

# --- Step 5: Config and .env symlinks ---
echo ""
echo "--- Step 5: Config and .env symlinks ---"
if [[ -f "$PROD_APP/.env" ]] && [[ -z "$DRY_RUN" ]]; then
  run cp -a "$PROD_APP/.env" "$HOME_FLIXCAM/config/.env.production"
  run chmod 600 "$HOME_FLIXCAM/config/.env.production"
fi
for env in production staging dev; do
  ENV_FILE="$HOME_FLIXCAM/config/.env.$env"
  APP_DIR="$HOME_FLIXCAM/apps/$env/flixcam"
  if [[ ! -f "$ENV_FILE" ]] && [[ -z "$DRY_RUN" ]]; then
    [[ -f "$HOME_FLIXCAM/config/.env.production" ]] && cp "$HOME_FLIXCAM/config/.env.production" "$ENV_FILE" || touch "$ENV_FILE"
    chmod 600 "$ENV_FILE"
  fi
  if [[ -z "$DRY_RUN" ]]; then
    rm -f "$APP_DIR/.env"
    ln -sf "$(realpath "$ENV_FILE" 2>/dev/null || echo "../../config/.env.$env")" "$APP_DIR/.env"
  fi
  echo "Linked $APP_DIR/.env -> config/.env.$env"
done

# --- Step 6: Shared uploads (symlink storage/uploads from each app) ---
echo ""
echo "--- Step 6: Shared uploads ---"
for env in production staging dev; do
  APP_DIR="$HOME_FLIXCAM/apps/$env/flixcam"
  STORAGE="$APP_DIR/storage"
  UPLOADS="$STORAGE/uploads"
  run mkdir -p "$STORAGE"
  if [[ -z "$DRY_RUN" ]]; then
    [[ -d "$UPLOADS" ]] && [[ ! -L "$UPLOADS" ]] && cp -a "$UPLOADS"/* "$HOME_FLIXCAM/shared/uploads/" 2>/dev/null || true
    rm -rf "$UPLOADS"
    ln -sf "$HOME_FLIXCAM/shared/uploads" "$UPLOADS"
  fi
  echo "Linked $UPLOADS -> shared/uploads"
done

# --- Step 7: Clean public_html (only remove old folders if we used the nested source) ---
echo ""
echo "--- Step 7: Clean public_html ---"
if [[ "$SOURCE_APP" != "${HOME_FLIXCAM}/public_html/app" ]]; then
  run rm -rf "$HOME_FLIXCAM/public_html/FlixCamFinal 3"
  run rm -rf "$HOME_FLIXCAM/public_html/__MACOSX"
  run rm -f  "$HOME_FLIXCAM/public_html/FlixCamFinal 3.zip"
fi
if [[ -z "$DRY_RUN" ]]; then
  echo "FlixCam" > "$HOME_FLIXCAM/public_html/index.html"
fi
echo "public_html cleaned; index.html set."

# --- Step 8: Place PM2 and nginx configs (if present next to script or in HOME_FLIXCAM) ---
echo ""
echo "--- Step 8: PM2 and Nginx config stubs ---"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
for eco in "$SCRIPT_DIR/ecosystem.config.js" "$HOME_FLIXCAM/ecosystem.config.js"; do
  if [[ -f "$eco" ]] && [[ -z "$DRY_RUN" ]]; then
    run cp "$eco" "$HOME_FLIXCAM/pm2/"
    echo "Copied ecosystem.config.js to pm2/"
    break
  fi
done
if [[ -d "$SCRIPT_DIR/nginx" ]]; then
  for f in "$SCRIPT_DIR/nginx"/*.conf; do
    [[ -f "$f" ]] && run cp "$f" "$HOME_FLIXCAM/shared/nginx/" && echo "Copied $(basename "$f") to shared/nginx/"
  done
fi

echo ""
echo "=== Migration complete ==="
echo "Next steps:"
echo "  1. Edit env files: $HOME_FLIXCAM/config/.env.production, .env.staging, .env.dev"
echo "  2. Set PORT and APP_URL per env (3000/3001/3002)."
echo "  3. Copy PM2 config: cp scripts/vps-migration/ecosystem.config.js $HOME_FLIXCAM/pm2/"
echo "  4. For each env: cd apps/<env>/flixcam && npm ci --omit=dev && npx prisma migrate deploy && npm run build"
echo "  5. Start: pm2 start $HOME_FLIXCAM/pm2/ecosystem.config.js"
echo "  6. Configure web server (Apache/Nginx) to proxy to ports 3000, 3001, 3002."
echo "See docs/FLIXCAM-VPS-GUIDE.md for full reference."
