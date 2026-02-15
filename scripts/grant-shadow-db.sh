#!/usr/bin/env bash
# Grants the database user from DATABASE_URL permission to create databases,
# so Prisma Migrate can create the shadow database for migration diffing.
# Run this once, then use: npm run db:migrate

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [ ! -f .env ]; then
  echo "❌ .env not found. Create it from .env.example first."
  exit 1
fi

# Load DATABASE_URL from .env (strip quotes)
DATABASE_URL=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//')

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set in .env"
  exit 1
fi

# Parse username from postgresql://USER:PASSWORD@host:port/db
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
if [ -z "$DB_USER" ]; then
  echo "❌ Could not parse username from DATABASE_URL"
  exit 1
fi

echo "📌 Database user from .env: $DB_USER"
echo ""
echo "Granting CREATEDB so Prisma can create the shadow database..."
echo ""

# Try with postgres superuser (common on Mac/Linux)
if psql -U postgres -d postgres -tAc "ALTER ROLE \"$DB_USER\" CREATEDB;" 2>/dev/null; then
  echo "✅ CREATEDB granted to role: $DB_USER"
  echo ""
  echo "You can now run: npm run db:migrate"
  exit 0
fi

# Try without -U (use current OS user, e.g. peer auth)
if psql -d postgres -tAc "ALTER ROLE \"$DB_USER\" CREATEDB;" 2>/dev/null; then
  echo "✅ CREATEDB granted to role: $DB_USER"
  echo ""
  echo "You can now run: npm run db:migrate"
  exit 0
fi

echo "⚠️  Could not run ALTER ROLE automatically (permission or auth)."
echo ""
echo "Run this manually as a PostgreSQL superuser:"
echo ""
echo "  psql -U postgres -d postgres -c \"ALTER ROLE \\\"$DB_USER\\\" CREATEDB;\""
echo ""
echo "Or open psql and run:"
echo "  ALTER ROLE \"$DB_USER\" CREATEDB;"
echo ""
exit 1
