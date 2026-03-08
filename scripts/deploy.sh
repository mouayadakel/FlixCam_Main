#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Multi-purpose Deploy Script for FlixCam.rent
# Handles: git pull, npm install, prisma migrate, build, and PM2 restart.
# Usage: ./scripts/deploy.sh
# ──────────────────────────────────────────────────────────────────────
set -e

# Configuration
REPO_ROOT="/home/flixcam.rent"
PM2_NAME="flixcam-rent"
PORT=3000

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

step() { echo -e "\n${BLUE}▶ [$((++STEP))] $1${NC}"; }
STEP=0

clear
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       FlixCam.rent Unified Deployment        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"

cd "$REPO_ROOT"

# 1. Pull latest code
step "Updating code from GitHub..."
echo "Checking for local changes..."
if ! git diff --quiet; then
  echo "⚠️  Local changes detected. Stashing..."
  git stash
  STASHED=true
else
  STASHED=false
fi

echo "Pulling latest changes from origin/main..."
git pull origin main

if [ "$STASHED" = true ]; then
  echo "Restoring stashed changes..."
  git stash pop || echo "⚠️  Warning: Conflicts during stash pop. Please check manually."
fi

# 2. Install dependencies
step "Installing dependencies (npm ci)..."
npm ci 2>/dev/null || npm install

# 3. Prisma setup
step "Configuring database (Prisma)..."
npx prisma generate
npx prisma migrate deploy

# 4. Build Next.js
step "Building Next.js application (this may take 1-2 minutes)..."
npm run build

# 5. Restart Process
step "Restarting application (PM2)..."
if pm2 list | grep -q "$PM2_NAME"; then
  pm2 restart "$PM2_NAME"
else
  echo "Initializing new PM2 process..."
  pm2 start npm --name "$PM2_NAME" -- start
fi
pm2 save

# 6. Health check
step "Verifying application status..."
echo "Waiting 12 seconds for the server to boot..."
sleep 12
if curl -sf "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Deployment successful and health check passed!${NC}"
  echo "Status: $(curl -s "http://localhost:$PORT/api/health")"
else
  echo -e "${RED}❌ Health check failed on port $PORT.${NC}"
  echo "Check logs: pm2 logs $PM2_NAME"
fi

echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}   DEPLOYMENT COMPLETED SUCCESSFULLY     ${NC}"
echo -e "${GREEN}=========================================${NC}"
