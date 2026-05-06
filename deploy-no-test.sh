#!/bin/bash
# =============================================
# FAST PRODUCTION DEPLOY — FlixCam VPS (No Tests)
# Run from: cd /home/flixcam.rent
# =============================================

set -e

echo "🚀 Starting deployment (no tests)..."

cd /home/flixcam.rent

echo "📥 Pulling latest code..."
git pull

echo "📦 Installing dependencies (locked)..."
npm ci

echo "🔓 Clearing DB locks (stale Prisma migrate lock can cause P1002 timeout)..."
# Release Prisma migrate advisory lock (72707369) from any session so migrate deploy can acquire it
su - postgres -c "psql -d flixcam_rent -t -A -c \"
SELECT pg_terminate_backend(pid) FROM pg_locks WHERE locktype = 'advisory' AND objid = 72707369 AND pid <> pg_backend_pid();
\""
# Terminate other non-idle connections to avoid blocking migrations
su - postgres -c "psql -d flixcam_rent -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'flixcam_rent' AND state != 'idle' AND pid <> pg_backend_pid();\""

echo "🗄️ Running migrations..."
npx prisma migrate deploy

echo "⚙️ Generating Prisma client..."
npx prisma generate

echo "🧹 Resolving route ambiguity..."
rm -rf "src/app/api/delivery/[bookingId]"

echo "🧹 Removing .next (avoids ENOTEMPTY / rmdir errors on fresh build)..."
rm -rf .next

echo "🏗️ Building app..."
npm run build

echo "♻️ Restarting app..."
pm2 restart all

echo "📋 Checking logs..."
pm2 logs --lines 20

echo "✅ Deployment complete!"
echo ""
echo "If the site works locally but not here, set NEXTAUTH_URL to your production URL in .env and run: pm2 restart all"
echo "See docs/PRODUCTION_VS_DEV.md for the full checklist."
