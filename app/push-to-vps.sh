#!/usr/bin/env bash
# push-to-vps.sh — Sync local workspace to VPS via rsync over SSH.
# Usage: ./push-to-vps.sh [--dry-run]
# Make executable once: chmod +x push-to-vps.sh

set -e

# --- Configuration (edit these for your environment) ---
REMOTE_USER="${REMOTE_USER:-flixcam}"
REMOTE_HOST="${REMOTE_HOST:-hostinger-vps}"
# Default: single-app at public_html/app. Use REMOTE_DIR=/home/flixcam/app if your server uses that path.
REMOTE_DIR="${REMOTE_DIR:-/home/flixcam/public_html/app}"
# Full path to rsync on the VPS (avoids "exec request failed on channel 0" when PATH is minimal)
REMOTE_RSYNC_PATH="${REMOTE_RSYNC_PATH:-/usr/bin/rsync}"

# Project root (directory where this script lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# --- Options ---
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY_RUN=true ;;
    -h|--help)
      echo "Usage: $0 [--dry-run|-n]"
      echo "  --dry-run, -n   Show what would be synced without transferring"
      echo "  -h, --help     Show this help"
      echo ""
      echo "Config (env or edit script): REMOTE_USER=$REMOTE_USER REMOTE_HOST=$REMOTE_HOST REMOTE_DIR=$REMOTE_DIR"
      exit 0
      ;;
  esac
done

# --- Rsync exclusions (keeps transfer fast and safe) ---
EXCLUDE=(
  --exclude='node_modules'
  --exclude='.git'
  --exclude='.env'
  --exclude='.env.*'
  --exclude='dist'
  --exclude='.next'
  --exclude='.turbo'
  --exclude='.cache'
  --exclude='*.log'
  --exclude='.DS_Store'
)

RSYNC_OPTS=(-avz --delete --rsync-path="$REMOTE_RSYNC_PATH" "${EXCLUDE[@]}")
if [[ "$DRY_RUN" == true ]]; then
  RSYNC_OPTS+=(--dry-run --verbose)
  echo "==> DRY RUN: no files will be changed on the server."
  echo ""
fi

REMOTE="$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"
echo "==> Syncing to $REMOTE"
echo "    Source: $SCRIPT_DIR"
echo "    Target: $REMOTE_DIR"
echo ""

# Use -e "ssh" so we pass --rsync-path; avoids "exec request failed on channel 0" when remote PATH is minimal
rsync -e ssh "${RSYNC_OPTS[@]}" ./ "$REMOTE/"

echo ""
echo "==> Done."
if [[ "$DRY_RUN" == true ]]; then
  echo "    Run without --dry-run to perform the actual sync."
fi
