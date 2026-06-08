#!/usr/bin/env bash
# Add GA4 Measurement Protocol API secret to .env (required for ga4-sync cron).
set -euo pipefail

ENV_FILE="${ENV_FILE:-/home/flixcam.rent/.env}"

echo "GA4 Measurement Protocol API secret"
echo "=================================="
echo "1. Open https://analytics.google.com/"
echo "2. Admin → Data streams → select your web stream"
echo "3. Measurement Protocol API secrets → Create"
echo "4. Paste the secret value below"
echo ""

if [[ -t 0 ]]; then
  read -r -s -p "API secret: " secret
  echo ""
  if [[ -z "$secret" ]]; then
    echo "No secret entered — aborting"
    exit 1
  fi
  if grep -q '^GA4_MEASUREMENT_API_SECRET=' "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^GA4_MEASUREMENT_API_SECRET=.*|GA4_MEASUREMENT_API_SECRET=${secret}|" "$ENV_FILE"
  else
    echo "GA4_MEASUREMENT_API_SECRET=${secret}" >> "$ENV_FILE"
  fi
  echo "Saved. Restart PM2: pm2 restart flixcam-rent --update-env"
else
  echo "Run interactively on the VPS to enter the secret."
  exit 2
fi
