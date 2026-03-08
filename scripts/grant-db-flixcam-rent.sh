#!/usr/bin/env bash
# Grant PostgreSQL user(s) access to database flixcam_rent.
# Run as postgres superuser (one-time or after creating the DB/user):
#   sudo -u postgres bash scripts/grant-db-flixcam-rent.sh
# Or: psql -U postgres -f scripts/grant-db-flixcam-rent.sql
set -e

DB_NAME="${DB_NAME:-flixcam_rent}"
# Users that need access (from .env: flixcam_user and/or flixcam)
DB_USERS="${DB_USERS:-flixcam_user flixcam}"

echo "==> Granting access to database $DB_NAME for users: $DB_USERS"
for u in $DB_USERS; do
  echo "  User: $u"
  psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $u;"
  psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $u;"
  psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $u;"
  psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $u;"
done
echo "==> Done. Run deploy script or npm run db:deploy + build in app dir if needed."
