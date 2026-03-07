#!/usr/bin/env bash
# Run this ON THE SERVER after code is updated (e.g. after git pull, or after post-receive hook checkout).
# From your machine: ssh root@76.13.63.81 'cd /path/to/app && bash scripts/server-build-restart.sh'
# Or on the server from repo root: ./scripts/server-build-restart.sh
set -e
cd "$(dirname "$0")/.."
HOME_FLIXCAM="${HOME_FLIXCAM:-/home/flixcam}"

if [[ ! -e .env ]]; then
  if [[ -f "$HOME_FLIXCAM/config/.env.production" ]]; then
    ln -sfn "$HOME_FLIXCAM/config/.env.production" .env
    echo "==> Linked .env -> $HOME_FLIXCAM/config/.env.production"
  else
    echo "==> ERROR: .env not found in $(pwd)"
    echo "    Create $(pwd)/.env or add $HOME_FLIXCAM/config/.env.production"
    exit 1
  fi
fi

echo "==> Installing dependencies..."
npm ci --omit=dev 2>/dev/null || npm install --omit=dev
echo "==> Prisma generate..."
npx prisma generate
echo "==> Prisma migrate deploy..."
npx prisma migrate deploy
echo "==> Building..."
npm run build
echo "==> Restarting app..."
if command -v pm2 &>/dev/null; then
  pm2 restart flixcam-production --update-env 2>/dev/null || pm2 restart flixcam-production 2>/dev/null || pm2 restart all 2>/dev/null || echo "  (pm2: no matching process restarted)"
elif command -v systemctl &>/dev/null && systemctl is-active --quiet flixcam 2>/dev/null; then
  sudo systemctl restart flixcam
else
  echo "  Restart your Node process manually (pm2 restart, systemctl, or kill + start)"
fi
echo "==> Done."
