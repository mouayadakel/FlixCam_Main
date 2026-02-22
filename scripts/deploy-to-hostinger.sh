#!/usr/bin/env bash
# Deploy FlixCam to Hostinger VPS via git push.
# Run from project root: ./scripts/deploy-to-hostinger.sh
# You will be prompted for SSH key passphrase (if using key) or VPS password.

set -e
cd "$(dirname "$0")/.."

REMOTE="hostinger"
REPO_PATH="/home/flixcam/repos/flixcam.git"

echo "==> Ensuring SSH key is in agent (you may be prompted for passphrase once)..."
if ! ssh-add -l 2>/dev/null | grep -q "id_ed25519"; then
  eval "$(ssh-agent -s)"
  ssh-add ~/.ssh/id_ed25519
fi

echo "==> Adding safe.directory on server (one-time fix for 'exec request failed on channel 0')..."
echo "    (If you use password auth, run this once on the server: git config --global --add safe.directory $REPO_PATH)"
ssh flixcam@hostinger-vps "git config --global --add safe.directory $REPO_PATH" 2>/dev/null || true

echo "==> Pushing main to $REMOTE (main)..."
git push "$REMOTE" main:main

echo "==> Done. Code is on Hostinger."
