-- Create root role so health checks and tools that default to OS user "root" can connect.
-- Run as the primary DB user (ci) after Postgres is up: psql -h localhost -U ci -d ci -f scripts/postgres-ci-init.sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'root') THEN
    CREATE ROLE root WITH LOGIN PASSWORD 'root' SUPERUSER;
  END IF;
END
$$;
