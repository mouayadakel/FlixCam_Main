#!/usr/bin/env bash
# Full phased deploy: build, restart workers, install cron, PM2 logrotate, smoke test.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Phase 0: Build & restart"
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
npm run build

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart ecosystem.config.js --update-env || pm2 restart all --update-env
  pm2 save
fi

echo "==> Phase 0: Install cron (requires root)"
if [[ "$(id -u)" -eq 0 ]]; then
  "$ROOT/scripts/install-vps-cron.sh"
  bash "$ROOT/scripts/setup-pm2-logrotate.sh" || true
  chmod +x "$ROOT/scripts/"*.sh
else
  echo "  Skip cron install (not root). Run: sudo $ROOT/scripts/install-vps-cron.sh"
fi

echo "==> Phase 0: Smoke test"
if [[ -f /etc/flixcam.cron.env ]]; then
  bash "$ROOT/scripts/phase0-smoke-test.sh" || echo "WARN: smoke test failed — check logs"
else
  echo "  Skip smoke test (no /etc/flixcam.cron.env)"
fi

echo "==> Done. Admin dashboard: /admin/ops/cron"
