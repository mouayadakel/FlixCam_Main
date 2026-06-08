#!/usr/bin/env bash
# Cron wrapper: load DATABASE_URL from app .env then run backup.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

"$ROOT/scripts/backup-database.sh"
"$ROOT/scripts/backup-retention.sh"
"$ROOT/scripts/backup-sync-remote.sh"
