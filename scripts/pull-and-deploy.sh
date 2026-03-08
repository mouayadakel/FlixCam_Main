#!/usr/bin/env bash
# Pull latest from git, then build and restart PM2 in the root directory.
# Run ON THE SERVER from repo root: ./scripts/pull-and-deploy.sh
set -e

REPO_ROOT="${REPO_ROOT:-/home/flixcam.rent}"
cd "$REPO_ROOT"

if [[ ! -d "$REPO_ROOT/.git" ]]; then
  echo "ERROR: Not a git repo: $REPO_ROOT"
  exit 1
fi

echo "==> Pulling latest (repo root: $REPO_ROOT)"
git pull origin main

echo ""
# Use the root build script instead of syncing to public_html
exec "$REPO_ROOT/scripts/server-build-restart.sh"
