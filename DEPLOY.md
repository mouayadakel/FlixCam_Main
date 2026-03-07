# Deployment Guide — FlixCam.rent

**Current production VPS (paths, PM2 name `flixcam-rent`, port 3001):** see **[docs/PRODUCTION_VPS_DEPLOY.md](docs/PRODUCTION_VPS_DEPLOY.md)** for the full checklist and copy-paste deploy block.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ running and accessible
- `.env` file configured (copy from `.env.example`)

## Required Environment Variables

| Variable                        | Required | Description                           |
| ------------------------------- | -------- | ------------------------------------- |
| `DATABASE_URL`                  | Yes      | PostgreSQL connection string          |
| `NEXTAUTH_SECRET`               | Yes      | 32+ char secret for auth              |
| `NEXTAUTH_URL`                  | Yes      | App URL (e.g. `https://flixcam.rent`) |
| `APP_URL`                       | Yes      | Same as NEXTAUTH_URL                  |
| `CRON_SECRET`                   | Yes      | Secret for cron endpoints             |
| `NEXT_PUBLIC_APP_URL`           | Yes      | Public-facing URL                     |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anon key                     |
| `REVALIDATE_BLOG_SECRET`        | Optional | Same as CRON_SECRET or dedicated; used to revalidate blog/CMS cache after deploy so control panel and blog changes are visible on the site |

## Deploy Steps (VPS / Server)

### Option A: From local machine to Hostinger VPS (recommended)

```bash
./scripts/deploy-to-hostinger.sh
# or: npm run deploy:hostinger
```

This pushes `main` to the Hostinger bare repo, SSHs to the server, updates the working copy to the latest commit (`git fetch` + `git reset --hard origin/main`), runs `scripts/server-build-restart.sh` (install, build, restart), and triggers blog/CMS revalidation when `REVALIDATE_BLOG_SECRET` or `CRON_SECRET` is set on the server. The live site stays in sync with the repo and control panel changes.

**Server requirement:** The app directory on the server (e.g. `/home/flixcam/www`) must be a git clone with `origin` pointing at the bare repo so `git fetch` / `git reset` work.

### Option B: On the server (after code is there)

```bash
cd /path/to/flixcam
git pull origin main   # or use deploy-to-hostinger.sh from your machine
bash scripts/deploy.sh
```

The script runs: `npm ci` -> `prisma generate` -> `prisma migrate deploy` -> `npm run build` -> restart (PM2/systemd) -> health check -> blog/CMS revalidation (if `REVALIDATE_BLOG_SECRET` or `CRON_SECRET` is set).

### Option C: Manual

```bash
cd /path/to/flixcam

# 1. Pull latest code
git pull origin main

# 2. Install dependencies (production only)
npm ci --omit=dev

# 3. Generate Prisma client
npx prisma generate

# 4. Apply migrations (non-interactive, safe for production)
npx prisma migrate deploy

# 5. Check migration status
npx prisma migrate status

# 6. Build
npm run build

# 7. Restart
pm2 restart flixcam
# or: sudo systemctl restart flixcam
# or: npm start
```

### Option D: First-time deploy (includes seed)

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run db:seed          # seed initial data
npm run build
npm start
```

## Health Check

```bash
curl http://localhost:3000/api/health
# Expected: { "status": "ok", "db": "connected" }
```

## Database Scripts Reference

| Script                 | Purpose                     | When to use                        |
| ---------------------- | --------------------------- | ---------------------------------- |
| `npm run db:deploy`    | Apply pending migrations    | Every deploy                       |
| `npm run db:generate`  | Generate Prisma client      | After schema changes               |
| `npm run db:seed`      | Seed initial data           | First deploy only                  |
| `npm run db:seed:rbac` | Seed RBAC roles/permissions | First deploy or after role changes |
| `npm run db:status`    | Check migration status      | Debugging                          |
| `npm run db:validate`  | Validate schema + format    | Before push                        |

## Pre-push Checklist

Before pushing, run:

```bash
npm run prepush
```

This runs lint, type-check, prisma validate, and scans migrations for unsafe SQL.

## Troubleshooting

### Migration failed (P3018)

If `prisma migrate deploy` fails:

```bash
# Mark the failed migration as rolled back so it can be re-applied
npx prisma migrate resolve --rolled-back <migration_name>

# Then re-run deploy
npx prisma migrate deploy
```

### Database drift

```bash
# Check which migrations are pending/failed
npx prisma migrate status

# If schema and migrations are out of sync
npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma
```

## CI/CD

GitHub Actions CI (`.github/workflows/ci.yml`) automatically runs on push to `main`:

1. Spins up fresh PostgreSQL
2. Runs `prisma migrate deploy` (validates all migrations work on fresh DB)
3. Runs lint, type-check, tests, and build
