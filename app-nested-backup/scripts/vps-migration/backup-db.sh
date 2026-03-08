#!/usr/bin/env bash
# FlixCam database backup with retention (daily/weekly).
# Run on VPS: /home/flixcam/scripts/backup-db.sh [production|staging|dev]
# Copy paths.config.sh to same dir to override paths.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$SCRIPT_DIR/paths.config.sh" ]] && . "$SCRIPT_DIR/paths.config.sh"
HOME_FLIXCAM="${HOME_FLIXCAM:-/home/flixcam}"
PRODUCTION_APP_PATH="${PRODUCTION_APP_PATH:-$HOME_FLIXCAM/public_html/app}"
ENV="${1:-production}"
BACKUP_ROOT="${SHARED_BACKUPS:-$HOME_FLIXCAM/shared/backups}"
DAILY="$BACKUP_ROOT/daily"
WEEKLY="$BACKUP_ROOT/weekly"
KEEP_DAILY="${KEEP_DAILY:-14}"
KEEP_WEEKLY="${KEEP_WEEKLY:-4}"
DATE=$(date +%Y%m%d)
TIME=$(date +%H%M)
DOW=$(date +%u)  # 1-7, 7=Sunday

mkdir -p "$DAILY" "$WEEKLY"

# Production single-app: .env in app dir; else config/.env.$ENV
if [[ "$ENV" = "production" ]] && [[ -f "${PRODUCTION_APP_PATH:-}/.env" ]]; then
  ENV_FILE="${PRODUCTION_APP_PATH}/.env"
else
  ENV_FILE="${CONFIG_DIR:-$HOME_FLIXCAM/config}/.env.$ENV"
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: No config: $ENV_FILE"
  exit 1
fi

# Load DATABASE_URL only (avoids breaking on special chars in other vars)
DATABASE_URL=$(grep -v '^#' "$ENV_FILE" | sed -n 's/^DATABASE_URL=//p' | head -1)
if [[ -z "$DATABASE_URL" ]]; then
  echo "ERROR: DATABASE_URL not set in $ENV_FILE"
  exit 1
fi

# pg_dump: strip ?schema=; use 127.0.0.1 so connection uses TCP and md5 auth (not ident)
PG_URL="${DATABASE_URL%%\?*}"
PG_URL="${PG_URL//localhost/127.0.0.1}"

OUT="$DAILY/flixcam_${ENV}_${DATE}_${TIME}.sql.gz"
pg_dump "$PG_URL" --no-owner --no-acl | gzip -9 > "$OUT"
echo "Backed up: $OUT"

# Weekly copy (e.g. Sunday)
if [[ "$DOW" = "7" ]]; then
  cp "$OUT" "$WEEKLY/flixcam_${ENV}_${DATE}.sql.gz"
  echo "Weekly copy: $WEEKLY/flixcam_${ENV}_${DATE}.sql.gz"
fi

# Retention: keep last KEEP_DAILY daily, last KEEP_WEEKLY weekly
find "$DAILY" -name "flixcam_${ENV}_*.sql.gz" -type f | sort -r | tail -n +$((KEEP_DAILY + 1)) | xargs -r rm -f
find "$WEEKLY" -name "flixcam_${ENV}_*.sql.gz" -type f | sort -r | tail -n +$((KEEP_WEEKLY + 1)) | xargs -r rm -f
