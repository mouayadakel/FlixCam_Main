#!/usr/bin/env bash
# Full setup and build sequence for FlixCam.rent
# Prerequisites: Node 18+, and PostgreSQL running (e.g. docker compose up -d)

set -e

cd "$(dirname "$0")/.."
echo "🚀 FlixCam.rent – full setup and build"
echo "======================================="

# 1. Start Postgres if Docker is available (optional)
if command -v docker >/dev/null 2>&1; then
  echo ""
  echo "📦 Starting Postgres with Docker..."
  docker compose up -d
  echo "   Waiting for Postgres (10s)..."
  sleep 10
else
  echo ""
  echo "⏭ Skipping Docker (not found). Ensure Postgres is running at localhost:5432."
fi

# 2. Prisma generate
echo ""
echo "📦 Prisma generate..."
npx prisma generate

# 3. Migrations
echo ""
echo "🗄️  Prisma migrate dev..."
npx prisma migrate dev --name setup

# 4. Seed
echo ""
echo "🌱 Database seed..."
npm run db:seed

# 5. Build
echo ""
echo "🔨 Production build..."
npm run build

echo ""
echo "✅ Full sequence complete."
echo "   Run: npm run start"
echo "   Admin: email admin@flixcam.rent / password admin123"
