#!/usr/bin/env bash
# Print UptimeRobot / Better Stack setup for FlixCam (run on VPS after UPTIME_WEBHOOK_SECRET is set).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

APP_URL="${APP_URL:-https://flixcam.rent}"
SECRET="${UPTIME_WEBHOOK_SECRET:-}"

echo "=== FlixCam external monitoring ==="
echo ""
echo "1) HTTP monitor (required)"
echo "   URL:    ${APP_URL}/api/health"
echo "   Expect: HTTP 200, body contains \"ok\""
echo "   Interval: 1–5 minutes"
echo ""
echo "2) Uptime webhook (optional, alerts on down/up)"
echo "   URL:    POST ${APP_URL}/api/webhooks/uptime"
echo "   Header: x-uptime-secret: <UPTIME_WEBHOOK_SECRET>"
echo "   Or:     Authorization: Bearer <UPTIME_WEBHOOK_SECRET>"
if [[ -n "$SECRET" ]]; then
  echo "   Secret: (set in .env — use: grep ^UPTIME_WEBHOOK_SECRET= $ENV_FILE)"
else
  echo "   Secret: NOT SET — add UPTIME_WEBHOOK_SECRET to .env"
fi
echo ""
echo "3) Sitemap (Search Console)"
echo "   Submit: ${APP_URL}/sitemap.xml"
echo "   Verify: ${APP_URL}/google3300a776609aca51.html"
echo ""
echo "4) Cron health (internal, already scheduled)"
echo "   */15 * * * * cron-invoke /api/cron/run/health-check"
