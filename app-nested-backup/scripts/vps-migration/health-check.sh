#!/usr/bin/env bash
# FlixCam health check: HTTP and PM2 status for all environments.
# Run on VPS: /home/flixcam/scripts/health-check.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$SCRIPT_DIR/paths.config.sh" ]] && . "$SCRIPT_DIR/paths.config.sh"
HOME_FLIXCAM="${HOME_FLIXCAM:-/home/flixcam}"
SHARED_BACKUPS="${SHARED_BACKUPS:-$HOME_FLIXCAM/shared/backups}"
LOGS_DIR="${LOGS_DIR:-$HOME_FLIXCAM/logs}"
PORTS=(3000 3001 3002)
ENVS=(production staging dev)

echo "=== PM2 status ==="
pm2 list | grep -E 'flixcam|online|errored' || true

echo ""
echo "=== HTTP check (localhost) ==="
for i in "${!PORTS[@]}"; do
  port="${PORTS[$i]}"
  env="${ENVS[$i]}"
  if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${port}/" 2>/dev/null | grep -qE '200|301|302'; then
    echo "  [$env] port $port: OK"
  else
    echo "  [$env] port $port: FAIL or not responding"
  fi
done

echo ""
echo "=== Disk (backups + logs) ==="
du -sh "$SHARED_BACKUPS" 2>/dev/null || true
du -sh "$LOGS_DIR" 2>/dev/null || true
