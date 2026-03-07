#!/usr/bin/env bash
# Run project fully: install, migrate, seed all, then start dev server.
# Usage: from repo root, run: ./scripts/run-full-setup.sh
# Or: bash scripts/run-full-setup.sh

set -e
cd "$(dirname "$0")/.."
ROOT="$PWD"

echo "=============================================="
echo "  FlixCam.rent – full setup and run"
echo "=============================================="
echo ""

# 1. .env check
if [ ! -f .env ]; then
  echo "❌ .env not found. Copy .env.example to .env and set DATABASE_URL."
  exit 1
fi
if ! grep -q "DATABASE_URL=" .env; then
  echo "❌ DATABASE_URL missing in .env"
  exit 1
fi
echo "✅ .env found"

# 2. Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# 3. Prisma generate
echo ""
echo "🔧 Prisma generate..."
npx prisma generate

# 4. Migrate (deploy = apply existing; use 'migrate dev' if you need to create new migrations)
echo ""
echo "🗄️  Applying migrations..."
npx prisma migrate deploy

# 5. Seed main data
echo ""
echo "🌱 Seeding database (main)..."
npm run db:seed

# 6. Optional seeds (RBAC, equipment, lighting)
echo ""
echo "🌱 Seeding RBAC..."
npm run db:seed:rbac 2>/dev/null || echo "   (db:seed:rbac skipped or failed)"

echo ""
echo "🌱 Seeding lighting subcategories..."
npm run db:seed:lighting-subcategories 2>/dev/null || echo "   (db:seed:lighting-subcategories skipped or failed)"

echo ""
echo "🌱 Seeding QSM rent equipment..."
npm run db:seed:qsmrent 2>/dev/null || echo "   (db:seed:qsmrent skipped or failed)"

# 7. Start dev server
echo ""
echo "=============================================="
echo "  Starting Next.js dev server..."
echo "  Admin: admin@flixcam.rent / admin123"
echo "=============================================="
exec npm run dev
