# FlixCam VPS Restructure Plan

> **Scope:** Standardize the Next.js 16 app on VPS with a clean **single default production layout** and optional multi-environment layout.
> **Stack:** Next.js 16 · Node.js · PM2 · Apache (or Nginx) · PostgreSQL · Redis

---

## Repo structure (fixed)

In this repository, the app now lives under **`app/`** (no spaces, no nested duplicate):

- **Before:** `public_html/FlixCamFinal 3/FlixCamFinal 3/`  
- **After:** `public_html/app/` ← app root (package.json, src/, prisma/, etc.)

The migration script on the VPS uses `public_html/app` when present, or falls back to the old path for servers not yet updated.

---

## Problems this plan fixes (on the VPS)

| Severity | Problem | Notes |
|----------|---------|--------|
| 🔴 Critical | Folder names with spaces | Fixed in repo (`app/`) |
| 🔴 Critical | App path ≠ deploy path | Fixed by standard default path `/home/flixcam/public_html/app` |
| 🟠 High | Nested duplicate | Removed in repo; migration creates flat env dirs |
| 🟠 High | Dev folders in live tree | Migration strips `.cursor`, `.history`, `__MACOSX` when copying to production |
| 🟡 Medium | No env separation | Migration sets up `config/.env.production`, `.env.staging`, `.env.dev` |
| 🟢 Low | Web root | `public_html/index.html` stays as maintenance/welcome |

---

## Target Folder Structure (Default + Optional Multi-Env)

```
/home/flixcam/
│
├── public_html/
│   └── app/                      # Default production app code (port 3000)
│       ├── app/
│       ├── prisma/
│       ├── scripts/
│       ├── .env
│       └── .next/
│
├── shared/
│   ├── uploads/                 # User uploads (symlinked into each app’s storage)
│   ├── backups/
│   │   ├── daily/
│   │   └── weekly/
│   ├── ssl/                     # SSL certs (or use /etc/letsencrypt)
│   └── nginx/                   # Nginx configs (or Apache under docs)
│       ├── production.conf
│       ├── staging.conf
│       └── dev.conf
│
├── config/                      # Optional shared env path
│   └── .env.production
│
├── logs/
│   ├── production/              # app.log, error.log, nginx/ or apache/
│   ├── staging/
│   └── dev/
│
├── scripts/                     # Server-level scripts (deploy, backup, health)
│   ├── deploy.sh
│   ├── backup-db.sh
│   ├── switch-env.sh
│   └── health-check.sh
│
├── pm2/
│   └── ecosystem.config.js      # PM2 config for all environments
│
├── repos/
│   └── flixcam.git/             # Bare git repo (push-to-deploy)
│
└── apps/                        # Optional multi-env layout
    ├── production/flixcam
    ├── staging/flixcam
    └── dev/flixcam
```

**Default port:** Production 3000.
Staging/Dev ports are optional only if multi-env is enabled.

---

## How to Run the Migration

1. **Upload the migration script** (from this repo) to the VPS:
   ```bash
   scp scripts/vps-migration/flixcam-migration.sh flixcam@YOUR_VPS:/home/flixcam/
   chmod +x /home/flixcam/flixcam-migration.sh
   ```
2. **Take a snapshot/backup** of the VPS and database.
3. **Run** (dry-run first if the script supports it):
   ```bash
   ./flixcam-migration.sh
   ```
4. **Edit env file** at `/home/flixcam/public_html/app/.env` (or symlink from config).
5. **Install, build, and start** production app (see **FLIXCAM-VPS-GUIDE.md**).

Full command reference and post-migration steps are in **`docs/FLIXCAM-VPS-GUIDE.md`** and **`scripts/vps-migration/README.md`**.

---

## Plan checklist (what’s in the repo)

| Item | Status |
|------|--------|
| Repo app path: no spaces, no nesting | ✅ App lives at `public_html/app/` |
| Target structure documented | ✅ This doc + FLIXCAM-VPS-GUIDE |
| Migration script (backup, dirs, copy app, .env, uploads, clean, PM2/nginx) | ✅ `scripts/vps-migration/flixcam-migration.sh` |
| deploy.sh (production/staging/dev, --build) | ✅ `scripts/vps-migration/deploy.sh` |
| backup-db.sh (per-env, retention) | ✅ `scripts/vps-migration/backup-db.sh` |
| backup.sh (simple production + uploads) | ✅ `scripts/vps-migration/backup.sh` |
| health-check.sh | ✅ `scripts/vps-migration/health-check.sh` |
| switch-env.sh | ✅ `scripts/vps-migration/switch-env.sh` |
| rotate-logs.sh | ✅ `scripts/vps-migration/rotate-logs.sh` |
| PM2 ecosystem (all 3 envs, ports 3000/3001/3002) | ✅ `scripts/vps-migration/ecosystem.config.js` |
| Nginx configs (production, staging, dev) | ✅ `scripts/vps-migration/nginx/*.conf` |
| Apache example (production; note for staging/dev) | ✅ `scripts/vps-migration/flixcam.conf.example` |
| Git post-receive hook (deploy to production app) | ✅ `scripts/vps-migration/post-receive` |
| deploy-to-hostinger.sh default path | ✅ Default `SERVER_APP_PATH` = `public_html/app` |
| server-build-restart.sh PM2 name | ✅ Tries `flixcam-production` then `flixcam` then `all` |
| Full VPS guide (upload order, env vars, cron, commands) | ✅ `docs/FLIXCAM-VPS-GUIDE.md` |
| vps-migration file index | ✅ `scripts/vps-migration/README.md` |
