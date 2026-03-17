# Prisma P1002 (Advisory Lock Timeout) — Diagnostic Checklist

Use this when `npx prisma migrate deploy` fails with:

```text
Error: P1002
The database server was reached but timed out.
Context: Timed out trying to acquire a postgres advisory lock (SELECT pg_advisory_lock(72707369)).
```

## Root causes (check in order)

1. **Stale advisory lock** — A previous migrate (or `migrate dev` shadow DB) left a connection open that still holds lock `72707369`. Most common.
2. **Zombie process** — Crashed migrate or Node process still connected and holding the lock.
3. **Connection pool exhaustion** — App or other clients using all connections so migrate can't get one (less common with default limits).
4. **PgBouncer / proxy** — If you use a connection pooler in transaction mode, migrate must use a **direct** URL (no pooler) so the same connection holds the lock for the whole migration. Add `directUrl` in `schema.prisma` and use it for migrations.
5. **Misconfigured DATABASE_URL** — Wrong host/port, SSL, or auth so connections are slow or failing.

## Diagnostic steps (run as DB superuser, e.g. `su - postgres`)

```bash
# 1. Who holds the Prisma advisory lock?
psql -d flixcam_rent -c "
  SELECT l.pid, a.usename, a.state, a.query_start, left(a.query, 60)
  FROM pg_locks l
  JOIN pg_stat_activity a ON a.pid = l.pid
  WHERE l.locktype = 'advisory' AND l.objid = 72707369;
"

# 2. All advisory locks in the DB
psql -d flixcam_rent -c "
  SELECT pid, locktype, objid, mode, granted FROM pg_locks WHERE locktype = 'advisory';
"

# 3. Active/idle connections
psql -d flixcam_rent -c "
  SELECT pid, usename, state, query_start, left(query, 70)
  FROM pg_stat_activity WHERE datname = 'flixcam_rent' ORDER BY query_start;
"

# 4. Failed or dirty migration row
psql -d flixcam_rent -c "
  SELECT migration_name, finished_at, rolled_back_at, started_at
  FROM _prisma_migrations WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL;
"
```

## Fixes

### A. Release stale lock (most common)

Terminate the backend(s) holding the lock (from step 1). Replace `<pid>` with the PID from the query:

```bash
su - postgres -c "psql -d flixcam_rent -c \"SELECT pg_terminate_backend(<pid>);\""
```

Or terminate all backends holding that advisory lock:

```bash
su - postgres -c "psql -d flixcam_rent -t -A -c \"
  SELECT pg_terminate_backend(pid) FROM pg_locks
  WHERE locktype = 'advisory' AND objid = 72707369 AND pid <> pg_backend_pid();
\""
```

Then run:

```bash
npx prisma migrate deploy
```

### B. Failed migration (P3018) — DB already in target state

If the migration failed partway and the DB is already correct (e.g. enum/table already exist):

```bash
npx prisma migrate resolve --applied <migration_name>
npx prisma migrate deploy
```

### C. Failed migration — need to retry

If the migration failed and you fixed the SQL (e.g. idempotent enum creation):

```sql
-- In psql as superuser
UPDATE _prisma_migrations
SET rolled_back_at = NOW()
WHERE migration_name = '<name>' AND finished_at IS NULL;
```

Then run `npx prisma migrate deploy` again.

### D. PgBouncer / pooler

In `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   # can be pooler URL for app
  directUrl = env("DIRECT_URL")     # direct Postgres URL for migrations
}
```

Use `DIRECT_URL` for migrations (no pooler).

## Prevention

- **Deploy script** — Before `prisma migrate deploy`, terminate any backend holding advisory lock `72707369` (see `deploy.sh`).
- **No long-lived connections during deploy** — Avoid running `migrate dev` or other migrate commands on production; use `migrate deploy` and run it from a single deploy process.
- **Idempotent migrations** — For enums/tables that might already exist, use `IF NOT EXISTS` or conditional PL/pgSQL so the same migration can run safely elsewhere.
