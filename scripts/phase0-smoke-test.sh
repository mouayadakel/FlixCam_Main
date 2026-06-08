#!/usr/bin/env bash
# Phase 0 — smoke test cron endpoints and health after deploy.
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/flixcam.cron.env}"
APP_URL="${APP_URL:-https://flixcam.rent}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "ERROR: CRON_SECRET not set" >&2
  exit 1
fi

AUTH=(-H "Authorization: Bearer ${CRON_SECRET}")
FAILED=0

check() {
  local name="$1"
  local path="$2"
  echo -n "  $name ... "
  if curl -sf --max-time 60 "${AUTH[@]}" "${APP_URL}${path}" >/dev/null; then
    echo "OK"
  else
    echo "FAIL"
    FAILED=$((FAILED + 1))
  fi
}

echo "==> Health"
check "health" "/api/health"

echo "==> Tier 1 cron jobs"
check "health-check" "/api/cron/run/health-check"
check "payment-retry" "/api/cron/run/payment-retry"
check "rental-status-updates" "/api/cron/run/rental-status-updates"
check "notification-queue" "/api/cron/run/notification-queue"
check "inventory-sync" "/api/cron/run/inventory-sync"
check "moyasar-webhooks" "/api/cron/moyasar-webhooks"
check "reminders" "/api/cron/reminders"

echo "==> Legacy routes"
check "invoice-overdue" "/api/cron/invoice-overdue"
check "abandoned-carts" "/api/cron/abandoned-carts"

if [[ "$FAILED" -gt 0 ]]; then
  echo "FAILED: $FAILED checks" >&2
  exit 1
fi

echo "All smoke tests passed."
