#!/usr/bin/env bash
# Run before git push to catch issues early.
# Usage: bash prepush.sh && git add . && git commit -m "..." && git push
set -e

echo "▶ npm ci..."
npm ci

echo "▶ lint..."
npm run lint

echo "▶ type-check..."
npm run type-check

# If you changed prisma/schema.prisma, run locally first:
#   npm run db:migrate   (or: npx prisma migrate dev)
# Then ensure new migrations are in the commit (prisma/migrations/*/migration.sql).
echo ""
echo "✅ OK to push (ensure prisma migrations are committed if you changed schema.prisma)"
