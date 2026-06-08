#!/usr/bin/env bash
# Phase 9e — Copy .env.example to staging template (do not commit secrets).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/.env.staging.example}"

cat >"$OUT" <<'EOF'
# Staging environment template — copy to .env.staging and fill values
APP_URL=https://staging.flixcam.rent
NEXTAUTH_URL=https://staging.flixcam.rent
DATABASE_URL=postgresql://user:pass@localhost:5432/flixcam_staging
REDIS_URL=redis://localhost:6379
CRON_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SENTRY_DSN=
EOF

echo "Wrote $OUT"
