# FlixCam First-Time Production Deployment

Step-by-step guide from local repo to live production. Default structure is single-app at `/home/flixcam/public_html/app` (see `app/.cursorrules`). Use **first-time-setup.sh** to automate install, migrate, seed, build, and PM2.

---

## Prerequisites

- VPS with SSH access (e.g. flixcam@your-server)
- Domain pointing to the VPS (e.g. flixcam.rent)
- Local repo on `main` with all deployment scripts committed

---

## Phase 0: Local pre-flight

```bash
git branch          # main or master
git status          # clean working tree
ls scripts/vps-migration/
# Expect: flixcam-migration.sh, deploy.sh, backup-db.sh, first-time-setup.sh, ecosystem.config.js, nginx/*.conf
ls docs/
# Expect: FLIXCAM-VPS-GUIDE.md, FIRST-TIME-DEPLOYMENT.md
grep -E '"build"|"start"|"db:seed"' package.json
```

Commit and push any new files (first-time-setup.sh, .env.production.template, docs).

---

## Phase 1: Production .env template (local)

- Use **.env.production.template** in the repo (or copy from .env.example and set production values).
- On the server you will copy it to `/home/flixcam/public_html/app/.env` and fill in:
  - `DATABASE_URL` (production DB and password)
  - `NEXTAUTH_SECRET`, `CRON_SECRET`, `ENCRYPTION_KEY` (generate with `openssl rand -base64 32`)
  - All API keys (Supabase, payments, email, storage, Redis, etc.)

---

## Phase 2: VPS system setup

Install once on the server:

- **Node.js 20+** (e.g. NodeSource or nvm)
- **PostgreSQL 15+**
- **Nginx** (or Apache)
- **PM2** (`npm install -g pm2`)

Create database and user:

```bash
sudo -u postgres psql -c "CREATE DATABASE flixcam_production;"
sudo -u postgres psql -c "CREATE USER flixcam_user WITH PASSWORD 'strong_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE flixcam_production TO flixcam_user;"
# Grant schema/table rights in flixcam_production as needed for your PostgreSQL version
```

---

## Phase 3: Get code on the server

Default and recommended path:

```bash
cd /home/flixcam
chmod +x /home/flixcam/flixcam-migration.sh   # if you uploaded it here
./flixcam-migration.sh
# Or run from repo: cd /path/to/repo && ./scripts/vps-migration/flixcam-migration.sh
```

If you use the default single-app layout, you can skip migration and deploy directly into `/home/flixcam/public_html/app`.
Use migration only for legacy restructuring cases; standard production remains `/home/flixcam/public_html/app`.

---

## Phase 4: Configure production `.env`

Copy the repo template if you didn’t bring one:  
`cp /home/flixcam/public_html/app/.env.production.template /home/flixcam/public_html/app/.env`  
Then edit and fill in all values.

```bash
cd /home/flixcam/public_html/app

# If .env is a symlink to config, edit the target:
nano /home/flixcam/config/.env.production
# Or if .env is local:
nano .env

# Set at least:
# NODE_ENV=production
# APP_ENV=production
# PORT=3000
# APP_URL=https://flixcam.rent
# NEXT_PUBLIC_APP_URL=https://flixcam.rent
# NEXTAUTH_URL=https://flixcam.rent
# DATABASE_URL=postgresql://flixcam_user:PASSWORD@localhost:5432/flixcam_production?schema=public
# NEXTAUTH_SECRET=...   (openssl rand -base64 32)
# CRON_SECRET=...      (openssl rand -base64 32)
# ENCRYPTION_KEY=...   (openssl rand -base64 32)

chmod 600 .env
# or chmod 600 /home/flixcam/config/.env.production
```

Copy all other variables from your local .env.example and fill production values (payments, email, storage, Redis, etc.).

---

## Phase 5: Run first-time setup (automated)

```bash
# Copy first-time-setup.sh to server scripts if not already there
# e.g. from repo: scp scripts/vps-migration/first-time-setup.sh flixcam@server:/home/flixcam/scripts/
chmod +x /home/flixcam/scripts/first-time-setup.sh
/home/flixcam/scripts/first-time-setup.sh
```

This script will:

1. Verify .env (NODE_ENV, PORT, DATABASE_URL, etc.)
2. `npm ci --omit=dev`
3. `npx prisma generate`
4. `npx prisma migrate deploy`
5. `npm run db:seed`
6. `rm -rf .next && npm run build`
7. Start/restart PM2 (flixcam)
8. Remind you to copy Nginx config and reload
9. Run backup-db.sh once and show crontab line
10. Quick health check (curl localhost:3000)

---

## Phase 6: Nginx and SSL

```bash
sudo cp /home/flixcam/shared/nginx/production.conf /etc/nginx/conf.d/flixcam-production.conf
# Edit server_name and SSL paths if needed
sudo nginx -t
sudo systemctl reload nginx

# SSL (Let's Encrypt)
sudo certbot --nginx -d flixcam.rent -d www.flixcam.rent
sudo certbot renew --dry-run
```

---

## Phase 7: Verification

```bash
pm2 status
pm2 logs flixcam-production --lines 50
curl -I http://localhost:3000
curl -I https://flixcam.rent
```

In the browser: open https://flixcam.rent, test login, products, cart, and admin if applicable.

---

## Quick reference after first-time setup

| Action              | Command |
|---------------------|--------|
| Deploy updates      | `./scripts/deploy.sh production` |
| Backup DB           | `./scripts/backup-db.sh production` |
| Logs                | `pm2 logs flixcam-production` |
| Restart             | `pm2 restart flixcam-production` |
| Full guide          | [FLIXCAM-VPS-GUIDE.md](./FLIXCAM-VPS-GUIDE.md) |
