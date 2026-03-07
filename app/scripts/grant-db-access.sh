#!/usr/bin/env bash
# Fix: "User `flixcam` was denied access on the database `flixcam_rent.public`"
# Grants the DATABASE_URL user full access to the database and schema public.
# Run as PostgreSQL superuser (e.g. postgres) once per environment.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [ ! -f .env ]; then
  echo "❌ .env not found. Create it from .env.example first."
  exit 1
fi

# Parse DATABASE_URL: postgresql://USER:PASSWORD@host:port/DBNAME
DATABASE_URL=$(grep -E '^DATABASE_URL=' .env | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^/?]*\).*|\1|p')

if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
  echo "❌ Could not parse user or database from DATABASE_URL"
  exit 1
fi

echo "📌 User: $DB_USER  Database: $DB_NAME"
echo ""
echo "Run the following as a PostgreSQL superuser (e.g. postgres):"
echo ""
echo "  sudo -u postgres psql -d postgres -c \\"
echo "    \"GRANT CONNECT ON DATABASE \\\"$DB_NAME\\\" TO \\\"$DB_USER\\\";\""
echo "  sudo -u postgres psql -d $DB_NAME -c \\"
echo "    \"GRANT USAGE ON SCHEMA public TO \\\"$DB_USER\\\";\""
echo "  sudo -u postgres psql -d $DB_NAME -c \\"
echo "    \"GRANT CREATE ON SCHEMA public TO \\\"$DB_USER\\\";\""
echo "  sudo -u postgres psql -d $DB_NAME -c \\"
echo "    \"GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \\\"$DB_USER\\\";\""
echo "  sudo -u postgres psql -d $DB_NAME -c \\"
echo "    \"GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \\\"$DB_USER\\\";\""
echo "  sudo -u postgres psql -d $DB_NAME -c \\"
echo "    \"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO \\\"$DB_USER\\\";\""
echo ""

# Try to run as postgres if we have sudo
if command -v sudo >/dev/null 2>&1; then
  echo "Attempting to run grants as postgres..."
  sudo -u postgres psql -d postgres -tAc "GRANT CONNECT ON DATABASE \"$DB_NAME\" TO \"$DB_USER\";" 2>/dev/null && true
  sudo -u postgres psql -d "$DB_NAME" -tAc "GRANT USAGE ON SCHEMA public TO \"$DB_USER\";" 2>/dev/null && true
  sudo -u postgres psql -d "$DB_NAME" -tAc "GRANT CREATE ON SCHEMA public TO \"$DB_USER\";" 2>/dev/null && true
  sudo -u postgres psql -d "$DB_NAME" -tAc "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"$DB_USER\";" 2>/dev/null && true
  sudo -u postgres psql -d "$DB_NAME" -tAc "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"$DB_USER\";" 2>/dev/null && true
  sudo -u postgres psql -d "$DB_NAME" -tAc "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO \"$DB_USER\";" 2>/dev/null && true
  echo "✅ If no errors above, try: npx prisma migrate deploy && npm run db:seed"
fi
