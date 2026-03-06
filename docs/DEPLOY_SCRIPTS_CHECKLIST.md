# Deploy Scripts Checklist — FlixCam.rent

Use this list when deploying the project to production (VPS, Hostinger, or any server).

---

## 1. Before deploy (local / one-time)

- [ ] Copy `.env.example` to `.env` and set **production** values.
- [ ] Required env vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (or `APP_URL`), `CRON_SECRET`.
- [ ] Optional (as needed): Tap Payments, Resend/SMTP, Supabase, Redis, OpenAI, etc. (see `.env.example`).

---

## 2. Get code onto the server

Pick **one** of these (run from your **local** machine, project root):

| Script                               | Use case                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `./scripts/deploy-to-hostinger.sh`   | **Recommended.** Push main to Hostinger, then SSH to server, update working copy to latest commit, run build + restart, and revalidate blog/CMS. One command keeps the site up to date. |
| `./push-to-vps.sh`                   | Sync project to VPS via **rsync** (no `.next`/node_modules; run build on server). |
| `./scripts/deploy-hostinger-sftp.sh` | Deploy via **tar over SSH** (SFTP-style) to Hostinger.                            |

For deploy-to-hostinger, the server app directory must be a git clone with `origin` at the bare repo. After other sync methods, **SSH into the server** and run the steps below in the app directory.

---

## 3. On the server (in app directory) — run in this order

### 3.1 Install dependencies

```bash
npm ci
```

_(Use `npm ci` for reproducible installs; or `npm install` if you prefer.)_

### 3.2 Generate Prisma client

```bash
npm run db:generate
```

### 3.3 Apply database migrations (required)

```bash
npm run db:deploy
```

_This runs `prisma migrate deploy` — applies all pending migrations. Use this in production (not `db:migrate`, which is for dev)._

### 3.4 Seed database (first deploy or when you need initial data)

**Option A — Migrations + seed in one go:**

```bash
npm run deploy:db
```

_Runs `prisma migrate deploy` then `tsx prisma/seed.ts`._

**Option B — Seed only (if you already ran `db:deploy`):**

```bash
npm run db:seed
```

**Optional seeds (run only if needed for this environment):**

```bash
npm run db:seed:rbac              # RBAC roles/permissions
npm run db:seed:qsmrent           # QSM rent equipment data
npm run db:seed:lighting-subcategories  # Lighting subcategories
```

### 3.5 Build for production

```bash
npm run build
```

### 3.6 Start the app

```bash
npm run start
```

_In production you’ll usually run this via a process manager (e.g. PM2 or systemd). Example service file: `scripts/flixcam.service.example`._

---

## 4. Health check (after start)

```bash
curl http://localhost:3000/api/health
```

Expected: `{ "status": "ok", "db": "connected" }`.

---

## 5. Quick reference — minimal deploy sequence

Run these on the **server** in the app directory (after code is there and `.env` is set):

```bash
npm ci
npm run db:generate
npm run db:deploy
npm run deploy:db    # or: npm run db:seed (if you only need seed)
npm run build
npm run start
```

---

## 6. Scripts you do **not** run for a normal deploy

| Script                     | Purpose — when to use                                                 |
| -------------------------- | --------------------------------------------------------------------- |
| `npm run db:migrate`       | **Dev only** — creates new migrations; use `db:deploy` in production. |
| `npm run db:push`          | Dev/prototyping — pushes schema without migration files.              |
| `npm run worker:import`    | Background import worker — run separately if you use import jobs.     |
| `npm run worker:all`       | All background workers — run separately if needed.                    |
| `npm run migrate:specs`    | One-off migration for equipment specs — run only when required.       |
| `npm run deploy:hostinger` | Pushes code to Hostinger, then on server: update to latest commit, build, restart, and revalidate blog/CMS (when REVALIDATE_BLOG_SECRET or CRON_SECRET is set). |

---

## 7. Optional: full local setup + build (dev / CI)

For a **full local setup** (Postgres via Docker, migrate dev, seed, build):

```bash
./scripts/full-setup-and-build.sh
```

_Uses `prisma migrate dev` — do **not** use this script on production; use the server steps above._

---

## 8. Troubleshooting — migration failed (P3018)

If `npm run db:deploy` fails with:

- **P3018** — "A migration failed to apply. New migrations cannot be applied before the error is recovered from."
- **Database error:** `index "Equipment_nameEn_idx" does not exist` (or similar locale index).

**Fix applied in repo:** Migration `20260221095309_add_locale_fields` was updated to use `DROP INDEX IF EXISTS` so deploy is idempotent. Ensure you have the latest code (`git pull`).

**If the failure already happened** on a persistent DB (e.g. CI or production), run **once** against that database (set `DATABASE_URL` to the failing DB):

```bash
npx prisma migrate resolve --rolled-back 20260221095309_add_locale_fields
```

Then run `npm run db:deploy` again (or re-run CI). See: [Prisma migrate resolve](https://pris.ly/d/migrate-resolve).

**Commit (full message):**

```text
fix: use DROP INDEX IF EXISTS in locale migration to fix P3018 deploy failure
Migration 20260221095309_add_locale_fields failed when indexes did not exist
(Equipment_nameEn_idx, etc.). Use IF EXISTS so deploy is idempotent.
Resolves: https://pris.ly/d/migrate-resolve
```

---

**Last updated:** February 2025
