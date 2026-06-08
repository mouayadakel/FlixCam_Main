#!/usr/bin/env bash
# Automated PostgreSQL backup (FIX-047). Requires pg_dump and DATABASE_URL.
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/flixcam-$STAMP.sql.gz"

# pg_dump rejects Prisma's ?schema= query param; use 127.0.0.1 (not localhost) to force password auth over TCP
DB_URL="${DATABASE_URL%%\?*}"
DB_URL="${DB_URL//localhost/127.0.0.1}"

if [[ "$DB_URL" =~ ^postgres(ql)?://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/([^?]+) ]]; then
  PGUSER="${BASH_REMATCH[2]}"
  PGPASSWORD="${BASH_REMATCH[3]}"
  PGHOST="${BASH_REMATCH[4]}"
  PGHOST="${PGHOST//localhost/127.0.0.1}"
  PGPORT="${BASH_REMATCH[5]:-5432}"
  PGDATABASE="${BASH_REMATCH[6]}"
  export PGPASSWORD
  pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" | gzip > "$FILE"
else
  pg_dump "$DB_URL" | gzip > "$FILE"
fi
unset PGPASSWORD 2>/dev/null || true
echo "Backup written: $FILE"
