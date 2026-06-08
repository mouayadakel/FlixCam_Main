#!/usr/bin/env bash
# Copy latest DB backup off-server when BACKUP_REMOTE_* is configured.
#
# Option A — rsync over SSH:
#   BACKUP_REMOTE_HOST=user@backup.example.com
#   BACKUP_REMOTE_PATH=/backups/flixcam
#
# Option B — local mirror (second disk):
#   BACKUP_REMOTE_PATH=/mnt/backup-disk/flixcam
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
REMOTE_HOST="${BACKUP_REMOTE_HOST:-}"
REMOTE_PATH="${BACKUP_REMOTE_PATH:-}"

if [[ -z "$REMOTE_PATH" ]]; then
  echo "BACKUP_REMOTE_PATH not set — skipping off-server sync"
  exit 0
fi

latest="$(ls -1t "$BACKUP_DIR"/flixcam-*.sql.gz 2>/dev/null | head -1 || true)"
if [[ -z "$latest" ]]; then
  echo "No backup files in $BACKUP_DIR"
  exit 0
fi

if [[ -n "$REMOTE_HOST" ]]; then
  echo "Syncing $(basename "$latest") to ${REMOTE_HOST}:${REMOTE_PATH}"
  ssh "$REMOTE_HOST" "mkdir -p '$REMOTE_PATH'"
  rsync -avz --progress "$latest" "${REMOTE_HOST}:${REMOTE_PATH}/"
else
  echo "Mirroring $(basename "$latest") to $REMOTE_PATH"
  mkdir -p "$REMOTE_PATH"
  rsync -av "$latest" "$REMOTE_PATH/"
fi

echo "Off-server sync complete"
