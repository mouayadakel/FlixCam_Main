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

| Script | Use case |
|--------|----------|
| `./push-to-vps.sh` | Sync project to VPS via **rsync** (no `.next`/node_modules; run build on server). |
| `./scripts/deploy-to-hostinger.sh` | Deploy via **git push** to Hostinger (bare repo). |
| `./scripts/deploy-hostinger-sftp.sh` | Deploy via **tar over SSH** (SFTP-style) to Hostinger. |

After sync, **SSH into the server** and run the steps below in the app directory.

---

## 3. On the server (in app directory) — run in this order

### 3.1 Install dependencies

```bash
npm ci
```

*(Use `npm ci` for reproducible installs; or `npm install` if you prefer.)*

### 3.2 Generate Prisma client

```bash
npm run db:generate
```

### 3.3 Apply database migrations (required)

```bash
npm run db:deploy
```

*This runs `prisma migrate deploy` — applies all pending migrations. Use this in production (not `db:migrate`, which is for dev).*

### 3.4 Seed database (first deploy or when you need initial data)

**Option A — Migrations + seed in one go:**

```bash
npm run deploy:db
```

*Runs `prisma migrate deploy` then `tsx prisma/seed.ts`.*

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

*In production you’ll usually run this via a process manager (e.g. PM2 or systemd). Example service file: `scripts/flixcam.service.example`.*

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

| Script | Purpose — when to use |
|--------|------------------------|
| `npm run db:migrate` | **Dev only** — creates new migrations; use `db:deploy` in production. |
| `npm run db:push` | Dev/prototyping — pushes schema without migration files. |
| `npm run worker:import` | Background import worker — run separately if you use import jobs. |
| `npm run worker:all` | All background workers — run separately if needed. |
| `npm run migrate:specs` | One-off migration for equipment specs — run only when required. |
| `npm run deploy:hostinger` | Pushes code via git to Hostinger; does not build or run DB on server. |

---

## 7. Optional: full local setup + build (dev / CI)

For a **full local setup** (Postgres via Docker, migrate dev, seed, build):

```bash
./scripts/full-setup-and-build.sh
```

*Uses `prisma migrate dev` — do **not** use this script on production; use the server steps above.*

---

**Last updated:** February 2025
