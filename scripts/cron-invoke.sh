#!/usr/bin/env bash
# Invoke a FlixCam cron HTTP endpoint from VPS crontab.
# Usage: cron-invoke.sh /api/cron/run/payment-retry
set -euo pipefail

PATH="${PATH:-/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin}"
ENV_FILE="${ENV_FILE:-/etc/flixcam.cron.env}"
APP_URL="${APP_URL:-https://flixcam.rent}"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /api/cron/..." >&2
  exit 1
fi

ENDPOINT="$1"
if [[ ! "$ENDPOINT" =~ ^/api/cron/ ]]; then
  echo "Endpoint must start with /api/cron/" >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "CRON_SECRET not set (expected in $ENV_FILE)" >&2
  exit 1
fi

curl -sf --max-time 120 \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${APP_URL}${ENDPOINT}"
