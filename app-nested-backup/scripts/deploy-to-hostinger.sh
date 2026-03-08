#!/usr/bin/env bash
# Deploy FlixCam to Hostinger VPS via git push.
# Run from project root: ./scripts/deploy-to-hostinger.sh [--build]
#   --build   After push, SSH to server and run build + restart (requires server app path).
# You will be prompted for SSH key passphrase (if using key) or VPS password.

set -e
cd "$(dirname "$0")/.."

REMOTE="hostinger"
REPO_PATH="/home/flixcam/repos/flixcam.git"
# Path on server. Default and standard: public_html/app
SERVER_APP_PATH="${SERVER_APP_PATH:-/home/flixcam/public_html/app}"

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

if [ "$1" = "--build" ]; then
  echo "==> Running build and restart on server (path: $SERVER_APP_PATH)..."
  ssh root@76.13.63.81 "cd $SERVER_APP_PATH && (git pull origin main 2>/dev/null || true) && bash scripts/server-build-restart.sh"
fi

echo "==> Done. Code is on Hostinger."
