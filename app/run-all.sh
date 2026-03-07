#!/usr/bin/env bash
# Run full setup: start Postgres, migrate, seed, build.
# Run this in your terminal (Docker must be installed and running).
set -e
cd "$(dirname "$0")"

echo "Starting Postgres..."
docker compose up -d
echo "Waiting for Postgres (15s)..."
sleep 15

echo "Running migrations..."
npx prisma migrate dev --name setup

echo "Seeding database..."
npm run db:seed

echo "Building app..."
npm run build

echo "Done. Run: npm run start"
