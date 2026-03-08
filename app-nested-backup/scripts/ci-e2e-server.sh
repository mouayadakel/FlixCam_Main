#!/usr/bin/env bash
# Start Next.js for E2E in CI. Exports DB and auth env so the app uses the
# Postgres "root" role (created by scripts/postgres-ci-init.sql in workflow).
# Used by playwright.config.ts webServer in CI only.
set -euo pipefail

export DATABASE_URL="${DATABASE_URL:-postgresql://root:root@localhost:5432/ci?schema=public}"
export AUTH_SECRET="${AUTH_SECRET:-ci-secret-minimum-32-characters-long}"
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-ci-secret-minimum-32-characters-long}"
export NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}"
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://placeholder.supabase.co}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-placeholder}"
export ENCRYPTION_KEY="${ENCRYPTION_KEY:-ci-encryption-key-32-chars-long!}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"

npm run build && npm run start
