#!/usr/bin/env bash
# Prune old SQL backups and optionally verify the newest dump.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
VERIFY_LATEST="${BACKUP_VERIFY_LATEST:-true}"

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "No backup dir: $BACKUP_DIR"
  exit 0
fi

echo "Pruning backups older than ${RETENTION_DAYS} days in $BACKUP_DIR"
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'flixcam-*.sql.gz' -mtime "+${RETENTION_DAYS}" -print -delete

count="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'flixcam-*.sql.gz' | wc -l)"
echo "Remaining backups: $count"

if [[ "$VERIFY_LATEST" == "true" ]]; then
  latest="$(ls -1t "$BACKUP_DIR"/flixcam-*.sql.gz 2>/dev/null | head -1 || true)"
  if [[ -n "$latest" ]]; then
    echo "Verifying gzip integrity: $latest"
    gzip -t "$latest"
    echo "OK: $latest"
  fi
fi
