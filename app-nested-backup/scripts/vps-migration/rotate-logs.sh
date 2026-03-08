#!/usr/bin/env bash
# FlixCam VPS log rotation helper.
# Deploy to /home/flixcam/scripts/rotate-logs.sh and run from cron (e.g. weekly)
# or use system logrotate with a config under /etc/logrotate.d/.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$SCRIPT_DIR/paths.config.sh" ]] && . "$SCRIPT_DIR/paths.config.sh"
HOME_FLIXCAM="${HOME_FLIXCAM:-/home/flixcam}"
LOG_ROOT="${LOGS_DIR:-$HOME_FLIXCAM/logs}"
DATE=$(date +%Y%m%d)

for dir in pm2 app apache; do
  d="$LOG_ROOT/$dir"
  [ ! -d "$d" ] && continue
  for f in "$d"/*.log; do
    [ -f "$f" ] || continue
    [ -s "$f" ] || continue
    mv "$f" "$f.$DATE"
    touch "$f"
    echo "Rotated $f"
  done
done

# Reload Apache so it reopens log handles (optional)
# systemctl reload httpd 2>/dev/null || true
