#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Server-side deploy script for FlixCam.rent
# Run ON THE SERVER inside the app directory after pulling latest code.
#
# Usage:  bash scripts/deploy.sh
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

step() { echo -e "\n${GREEN}▶ [$((++STEP))] $1${NC}"; }
STEP=0

echo "╔══════════════════════════════════════════════╗"
echo "║  FlixCam.rent — Production Deploy            ║"
echo "╚══════════════════════════════════════════════╝"

# ── 1. Install dependencies ──────────────────────────────────────────
step "Installing dependencies (npm ci; includes devDeps for build)..."
npm ci

# ── 2. Generate Prisma client ────────────────────────────────────────
step "Generating Prisma client..."
npx prisma generate

# ── 3. Apply database migrations ────────────────────────────────────
step "Applying database migrations..."
npx prisma migrate deploy

# ── 4. Migration status check ────────────────────────────────────────
step "Checking migration status..."
npx prisma migrate status

# ── 5. Build ─────────────────────────────────────────────────────────
step "Building application..."
npm run build

# ── 6. Restart ───────────────────────────────────────────────────────
step "Restarting application..."
if command -v pm2 &> /dev/null; then
  pm2 restart flixcam 2>/dev/null || pm2 start npm --name "flixcam" -- start
  echo "Restarted via PM2"
elif systemctl is-active --quiet flixcam 2>/dev/null; then
  sudo systemctl restart flixcam
  echo "Restarted via systemd"
else
  echo -e "${RED}No process manager detected. Start manually: npm start${NC}"
fi

# ── 7. Health check ──────────────────────────────────────────────────
step "Running health check..."
sleep 3
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Health check passed!${NC}"
  curl -s http://localhost:3000/api/health | head -c 200
  echo ""
else
  echo -e "${RED}⚠  Health check failed — check logs${NC}"
fi

# ── 8. Revalidate blog/CMS (so control panel changes are visible) ─────
REVALIDATE_SECRET="${REVALIDATE_BLOG_SECRET:-$CRON_SECRET}"
if [ -n "$REVALIDATE_SECRET" ]; then
  step "Revalidating blog/CMS cache..."
  if curl -sf -X POST -H "Authorization: Bearer $REVALIDATE_SECRET" http://localhost:3000/api/revalidate-blog > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Blog/CMS revalidation OK.${NC}"
  else
    echo -e "${RED}⚠  Revalidation failed (optional).${NC}"
  fi
fi

echo ""
echo -e "${GREEN}Deploy complete.${NC}"
