#!/usr/bin/env bash
# Deploy FlixCam to Hostinger VPS via git push.
# Run from project root: ./scripts/deploy-to-hostinger.sh
# Always pushes main, then SSHs to server, updates working copy, runs build + restart,
# and triggers blog/CMS revalidation so the site is up to date.
# You will be prompted for SSH key passphrase (if using key) or VPS password.

set -e
cd "$(dirname "$0")/.."

REMOTE="hostinger"
REPO_PATH="/home/flixcam/repos/flixcam.git"
# Path on server where the app is checked out (change if your server uses a different path)
SERVER_APP_PATH="${SERVER_APP_PATH:-/home/flixcam/www}"

echo "==> Ensuring SSH key is in agent (you may be prompted for passphrase once)..."
if ! ssh-add -l 2>/dev/null | grep -q "id_ed25519"; then
  eval "$(ssh-agent -s)"
  ssh-add ~/.ssh/id_ed25519
fi

echo "==> Adding safe.directory on server (one-time fix for 'exec request failed on channel 0')..."
echo "    (If you use password auth, run this once on the server: git config --global --add safe.directory $REPO_PATH)"
ssh root@76.13.63.81 "git config --global --add safe.directory $REPO_PATH" 2>/dev/null || true

echo "==> Pushing main to $REMOTE (main)..."
git push "$REMOTE" main:main

echo "==> Updating server, building, and restarting (path: $SERVER_APP_PATH)..."
# Update working copy to match pushed commit (fetch + reset so we never run old code)
ssh root@76.13.63.81 "cd $SERVER_APP_PATH && git fetch origin && git checkout main && git reset --hard origin/main && bash scripts/server-build-restart.sh"

echo "==> Done. Code is on Hostinger and app is up to date (blog/CMS revalidated if secret set)."
