#!/usr/bin/env bash
# Restart PM2 app when /api/health fails. Optional full redeploy on repeated failure.
set -euo pipefail

APP_URL="${APP_URL:-http://localhost:3000}"
PM2_NAME="${PM2_NAME:-flixcam-rent}"
MAX_RESTARTS_PER_HOUR="${MAX_RESTARTS_PER_HOUR:-3}"
WATCHDOG_AUTO_DEPLOY="${WATCHDOG_AUTO_DEPLOY:-false}"
REPO_ROOT="${REPO_ROOT:-/home/flixcam.rent}"
STATE_FILE="/var/run/flixcam-watchdog.state"
DEPLOY_SCRIPT="${DEPLOY_SCRIPT:-$REPO_ROOT/scripts/server-build-restart.sh}"

if curl -sf --max-time 15 "${APP_URL}/api/health" >/dev/null 2>&1; then
  echo "$(date -Is) OK health"
  exit 0
fi

echo "$(date -Is) WARN health check failed for ${APP_URL}/api/health"

hour_bucket="$(date +%Y%m%d%H)"
count=0
deploy_count=0
if [[ -f "$STATE_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$STATE_FILE" 2>/dev/null || true
fi
if [[ "${last_hour:-}" == "$hour_bucket" ]]; then
  count="${restart_count:-0}"
  deploy_count="${deploy_count:-0}"
else
  count=0
  deploy_count=0
fi

if [[ "$count" -ge "$MAX_RESTARTS_PER_HOUR" ]]; then
  echo "$(date -Is) ERROR restart cap reached ($count/hour); manual intervention required"
  exit 1
fi

count=$((count + 1))

if [[ "$WATCHDOG_AUTO_DEPLOY" == "true" ]] && [[ "$count" -ge 2 ]] && [[ "$deploy_count" -lt 1 ]]; then
  echo "$(date -Is) attempting auto-deploy via $DEPLOY_SCRIPT"
  if [[ -x "$DEPLOY_SCRIPT" ]] || [[ -f "$DEPLOY_SCRIPT" ]]; then
    if bash "$DEPLOY_SCRIPT" >> /var/log/flixcam-watchdog-deploy.log 2>&1; then
      deploy_count=1
      sleep 30
      if curl -sf --max-time 15 "${APP_URL}/api/health" >/dev/null 2>&1; then
        echo "$(date -Is) OK health after auto-deploy"
        cat >"$STATE_FILE" <<EOF
last_hour=$hour_bucket
restart_count=$count
deploy_count=$deploy_count
EOF
        exit 0
      fi
    fi
  fi
fi

cat >"$STATE_FILE" <<EOF
last_hour=$hour_bucket
restart_count=$count
deploy_count=$deploy_count
EOF

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env --silent 2>/dev/null \
    || pm2 restart all --update-env --silent 2>/dev/null \
    || true
  echo "$(date -Is) restarted PM2 ($PM2_NAME), attempt $count this hour"
else
  echo "$(date -Is) ERROR pm2 not found"
  exit 1
fi
