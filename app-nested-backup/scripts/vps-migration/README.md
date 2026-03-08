# FlixCam VPS migration scripts

Scripts and configs for VPS deploy. **Default and standard:** `/home/flixcam/public_html/app`.  
**Full instructions:** [docs/FLIXCAM-VPS-GUIDE.md](../../docs/FLIXCAM-VPS-GUIDE.md) and [docs/AUDIT-SERVER-PATHS.md](../../docs/AUDIT-SERVER-PATHS.md).

## Files

| File | Purpose |
|------|--------|
| **flixcam-migration.sh** | One-time migration: backup, create dirs, copy app to `apps/{production,staging,dev}/flixcam`, .env symlinks, shared uploads, clean `public_html`. Run with `--dry-run` first. |
| **deploy.sh** | Deploy an environment: `./deploy.sh production` or `staging` / `dev`; optional `--build`. |
| **backup-db.sh** | Per-env DB backup with retention: `./backup-db.sh production`. Use in cron. |
| **backup.sh** | Simple production DB + shared uploads backup (alternative to backup-db.sh). |
| **health-check.sh** | PM2 status and HTTP checks for ports 3000, 3001, 3002. |
| **switch-env.sh** | Notes which env is “live”; reverse proxy still decides by port/domain. |
| **rotate-logs.sh** | Rotate logs under `logs/{production,staging,dev}`. |
| **first-time-setup.sh** | **Run once after migration:** verifies .env, npm ci, prisma generate, migrate deploy, db:seed, build, PM2 start, nginx/backup reminders, verification. |
| **ecosystem.config.js** | PM2 config for all three envs (ports 3000, 3001, 3002). Copy to `/home/flixcam/pm2/`. |
| **nginx/production.conf** | Nginx vhost for production (port 3000). |
| **nginx/staging.conf** | Nginx vhost for staging (port 3001). |
| **nginx/dev.conf** | Nginx vhost for dev (port 3002). |
| **flixcam.conf.example** | Apache vhost for production (proxy to 3000). |
| **post-receive** | Git hook for push-to-deploy; copy to `repos/flixcam.git/hooks/post-receive`. |
| **paths.config.sh** | Single source of truth for paths. Copy to `/home/flixcam/scripts/` with the other scripts; set `PRODUCTION_APP_PATH` to override default `public_html/app`. |

## Quick order (single-app default: app at public_html/app)

1. Ensure app code is at `/home/flixcam/public_html/app` (e.g. rsync, git clone, or run **flixcam-migration.sh** for multi-env).
2. Copy **paths.config.sh**, **deploy.sh**, **backup-db.sh**, **first-time-setup.sh** to `/home/flixcam/scripts/`. Copy **ecosystem.config.js** to `/home/flixcam/pm2/`.
3. Copy **.env.production.template** to `/home/flixcam/public_html/app/.env` and fill in values.
4. Run **first-time-setup.sh** once: `/home/flixcam/scripts/first-time-setup.sh`.
5. Configure Nginx/Apache and SSL; add cron for backups.

All examples and scripts in this folder are aligned to the standard production path at `/home/flixcam/public_html/app`.

See **docs/FIRST-TIME-DEPLOYMENT.md** for the full first-time flow and **docs/FLIXCAM-VPS-GUIDE.md** for ongoing commands.
