#!/usr/bin/env bash
# Install FlixCam VPS crontab (requires root).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-/etc/flixcam.cron.env}"
CRON_DEST="${CRON_DEST:-/etc/cron.d/flixcam}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo $0"
  exit 1
fi

if [[ -f "$ROOT/.env" ]]; then
  # shellcheck disable=SC1091
  source <(grep -E '^CRON_SECRET=' "$ROOT/.env" | sed 's/^/export /')
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "CRON_SECRET not set. Add to $ROOT/.env or export before running."
  exit 1
fi

APP_URL="${APP_URL:-https://flixcam.rent}"

{
  echo "CRON_SECRET=${CRON_SECRET}"
  echo "APP_URL=${APP_URL}"
} > "$ENV_FILE"
chmod 600 "$ENV_FILE"

cp "$ROOT/scripts/vps-crontab.flixcam.example" "$CRON_DEST"
chmod 644 "$CRON_DEST"
chmod +x "$ROOT"/scripts/*.sh 2>/dev/null || true

echo "Installed $CRON_DEST and $ENV_FILE"
echo "Optional: run scripts/setup-pm2-logrotate.sh for log rotation"
