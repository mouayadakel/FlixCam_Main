#!/usr/bin/env bash
# FlixCam VPS backup: PostgreSQL (production) + shared uploads.
# Deploy to /home/flixcam/scripts/backup.sh and run from cron (e.g. daily 2am).
# Copy paths.config.sh to same dir to override paths.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$SCRIPT_DIR/paths.config.sh" ]] && . "$SCRIPT_DIR/paths.config.sh"
HOME_FLIXCAM="${HOME_FLIXCAM:-/home/flixcam}"
PRODUCTION_APP_PATH="${PRODUCTION_APP_PATH:-$HOME_FLIXCAM/public_html/app}"
BACKUP_ROOT="${SHARED_BACKUPS:-$HOME_FLIXCAM/shared/backups}"
DB_DIR="$BACKUP_ROOT/daily"
UPLOADS_DIR="$BACKUP_ROOT/uploads_archive"
SHARED_UPLOADS="${SHARED_UPLOADS:-$HOME_FLIXCAM/shared/uploads}"
# .env: prefer app dir (single-app), else config
if [[ -f "$PRODUCTION_APP_PATH/.env" ]]; then
  CONFIG="$PRODUCTION_APP_PATH/.env"
else
  CONFIG="${CONFIG_DIR:-$HOME_FLIXCAM/config}/.env.production"
fi
DATE=$(date +%Y%m%d-%H%M)

mkdir -p "$DB_DIR" "$UPLOADS_DIR"

if [ -f "$CONFIG" ]; then
  export $(grep -v '^#' "$CONFIG" | xargs)
fi
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set, skipping DB backup"
else
  pg_dump "$DATABASE_URL" --no-owner --no-acl | gzip -9 > "$DB_DIR/flixcam_production-$DATE.sql.gz"
  echo "DB backup: $DB_DIR/flixcam_production-$DATE.sql.gz"
fi

if [ -d "$SHARED_UPLOADS" ] && [ "$(ls -A $SHARED_UPLOADS 2>/dev/null)" ]; then
  SHARED_PARENT="$(dirname "$SHARED_UPLOADS")"
  tar -czf "$UPLOADS_DIR/uploads-$DATE.tar.gz" -C "$SHARED_PARENT" "$(basename "$SHARED_UPLOADS")"
  echo "Uploads backup: $UPLOADS_DIR/uploads-$DATE.tar.gz"
fi
