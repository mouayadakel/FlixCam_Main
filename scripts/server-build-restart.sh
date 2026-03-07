#!/usr/bin/env bash
# Run this ON THE SERVER after code is updated (e.g. after git pull, or after post-receive hook checkout).
# From your machine: ssh root@76.13.63.81 'cd /path/to/app && bash scripts/server-build-restart.sh'
# Or on the server from repo root: ./scripts/server-build-restart.sh
# After restart, if REVALIDATE_BLOG_SECRET or CRON_SECRET is set, calls /api/revalidate-blog so blog and CMS stay up to date.
set -e
cd "$(dirname "$0")/.."
echo "==> Installing dependencies (including dev for build)..."
npm ci 2>/dev/null || npm install
echo "==> Building..."
npm run build
echo "==> Restarting app..."
if command -v pm2 &>/dev/null; then
  pm2 restart flixcam 2>/dev/null || pm2 restart all 2>/dev/null || echo "  (pm2: no process named 'flixcam' or 'all' restarted)"
elif command -v systemctl &>/dev/null && systemctl is-active --quiet flixcam 2>/dev/null; then
  sudo systemctl restart flixcam
else
  echo "  Restart your Node process manually (pm2 restart, systemctl, or kill + start)"
fi

# Revalidate blog/CMS cache so control panel and blog changes are visible on the site
REVALIDATE_SECRET="${REVALIDATE_BLOG_SECRET:-$CRON_SECRET}"
if [ -n "$REVALIDATE_SECRET" ]; then
  echo "==> Revalidating blog/CMS cache..."
  sleep 4
  if curl -sf -X POST -H "Authorization: Bearer $REVALIDATE_SECRET" http://localhost:3000/api/revalidate-blog > /dev/null 2>&1; then
    echo "  Blog/CMS revalidation OK."
  else
    echo "  (Revalidation skipped or failed — app may still be starting; cron will refresh.)"
  fi
fi

echo "==> Done."
