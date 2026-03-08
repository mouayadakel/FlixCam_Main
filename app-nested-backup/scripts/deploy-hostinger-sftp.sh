#!/usr/bin/env bash
# Deploy FlixCam to Hostinger VPS via SSH + tar (SFTP-style; no rsync).
# Uses key ~/.ssh/id_ed25519 only; no password auth.
# Usage: ./scripts/deploy-hostinger-sftp.sh [--dry-run]
# chmod +x scripts/deploy-hostinger-sftp.sh

set -e

# --- Configuration ---
REMOTE_HOST="${REMOTE_HOST:-72.62.37.114}"
REMOTE_USER="${REMOTE_USER:-flixcam}"
REMOTE_DIR="${REMOTE_DIR:-/home/flixcam/public_html/app}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

SSH_OPTS=(-o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=10)
[[ -n "$SSH_KEY" && -f "$SSH_KEY" ]] && SSH_OPTS+=(-i "$SSH_KEY")

REMOTE="$REMOTE_USER@$REMOTE_HOST"

# --- Options ---
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY_RUN=true ;;
    -h|--help)
      echo "Usage: $0 [--dry-run|-n]"
      echo "  Deploy to $REMOTE_DIR on $REMOTE"
      echo "  SSH key: $SSH_KEY"
      exit 0
      ;;
  esac
done

echo "==> 1. Verifying SSH access ($REMOTE)..."
ssh "${SSH_OPTS[@]}" "$REMOTE" "echo OK" || {
  echo "SSH failed. Ensure key $SSH_KEY is used (e.g. ssh -i $SSH_KEY $REMOTE)"
  exit 1
}
echo "    OK"
echo ""

echo "==> 2. Ensuring remote directory exists..."
ssh "${SSH_OPTS[@]}" "$REMOTE" "mkdir -p $REMOTE_DIR"
echo "    $REMOTE_DIR"
echo ""

echo "==> 3. Syncing project (tar over SSH; excluding .git, node_modules, dist, .next, .env, .DS_Store)..."
if [[ "$DRY_RUN" == true ]]; then
  echo "    DRY RUN: would run tar | ssh (skipped)"
else
  COPYFILE_DISABLE=1 tar --exclude='.git' \
      --exclude='node_modules' \
      --exclude='dist' \
      --exclude='.next' \
      --exclude='out' \
      --exclude='.env' \
      --exclude='.env.*' \
      --exclude='.DS_Store' \
      --exclude='.turbo' \
      --exclude='.cache' \
      --exclude='*.log' \
      --exclude='.vscode' \
      -cf - . | ssh "${SSH_OPTS[@]}" "$REMOTE" "mkdir -p $REMOTE_DIR && cd $REMOTE_DIR && (ls -A 2>/dev/null | while read f; do case \"\$f\" in .env*) ;; *) rm -rf \"\$f\"; esac; done); tar -xf -"
  echo "    Sync done."
fi
echo ""

echo "==> 4. Remote: install deps and build..."
if [[ "$DRY_RUN" == true ]]; then
  echo "    DRY RUN: would run npm ci && npm run build (skipped)"
else
  ssh "${SSH_OPTS[@]}" "$REMOTE" "cd $REMOTE_DIR && rm -rf node_modules && (npm ci 2>/dev/null || npm install) && npm run build"
  echo "    Build done."
fi
echo ""

echo "==> 5. Restart app..."
if [[ "$DRY_RUN" == true ]]; then
  echo "    DRY RUN: would restart service or run npm start (skipped)"
else
  if ssh "${SSH_OPTS[@]}" "$REMOTE" "systemctl --user is-active --quiet flixcam 2>/dev/null" 2>/dev/null; then
    ssh "${SSH_OPTS[@]}" "$REMOTE" "systemctl --user restart flixcam"
    echo "    Restarted systemd user service: flixcam"
  elif ssh "${SSH_OPTS[@]}" "$REMOTE" "systemctl is-active --quiet flixcam 2>/dev/null" 2>/dev/null; then
    ssh "${SSH_OPTS[@]}" "$REMOTE" "sudo systemctl restart flixcam"
    echo "    Restarted systemd service: flixcam"
  else
    echo "    No systemd service 'flixcam' found. To run the app:"
    echo "      ssh $REMOTE 'cd $REMOTE_DIR && npm run start'"
    echo "    Or create a systemd unit (see deployment summary below)."
  fi
fi
echo ""

echo "=============================================="
echo "  DEPLOYMENT SUMMARY"
echo "=============================================="
echo "  Remote path:    $REMOTE_DIR"
echo "  Host:           $REMOTE"
echo "  Commands run:   mkdir, tar sync, npm ci, npm run build, restart (if service exists)"
echo "  Logs/status:    ssh $REMOTE 'cd $REMOTE_DIR && npm run start'  # if no systemd"
echo "                  ssh $REMOTE 'journalctl --user -u flixcam -f'  # if user service"
echo "                  ssh $REMOTE 'sudo journalctl -u flixcam -f'     # if system service"
echo "=============================================="
