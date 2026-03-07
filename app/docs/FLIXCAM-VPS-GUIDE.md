# FlixCam VPS Guide — Standard Production Setup

Complete reference for the standard VPS layout. Canonical server rules are in `app/.cursorrules`.

---

## 1. Target structure (default)

```
/home/flixcam/
├── public_html/
│   └── app/                   # Production app (Port 3000)
├── shared/
│   ├── uploads/               # Shared uploads
│   ├── backups/daily/
│   ├── backups/weekly/
│   └── nginx/                 # Nginx configs (or use Apache)
├── logs/
│   └── production/
├── scripts/
│   ├── deploy.sh
│   ├── backup-db.sh
│   ├── health-check.sh
│   └── switch-env.sh
├── pm2/
│   └── ecosystem.config.js
└── repos/
    └── flixcam.git/
```

Legacy multi-env layouts are not the default in this project. Keep production on `/home/flixcam/public_html/app`.

---

## 2. One-time setup

### 2.1 Upload scripts

From your **local machine** (from the **app** directory, i.e. repo root where `package.json` lives):

```bash
# Upload PM2 config and server scripts
scp scripts/vps-migration/ecosystem.config.js flixcam@YOUR_VPS_IP:/home/flixcam/
scp scripts/vps-migration/paths.config.sh scripts/vps-migration/deploy.sh \
    scripts/vps-migration/backup-db.sh scripts/vps-migration/health-check.sh \
    scripts/vps-migration/switch-env.sh scripts/vps-migration/backup.sh \
    scripts/vps-migration/rotate-logs.sh flixcam@YOUR_VPS_IP:/home/flixcam/scripts/
```

On the **VPS**:

```bash
chmod +x /home/flixcam/scripts/*.sh
cp /home/flixcam/ecosystem.config.js /home/flixcam/pm2/
```

---

## 3. Environment variables

Default `.env` location:

`/home/flixcam/public_html/app/.env`

Required minimum:

| Variable | Value |
|----------|-------|
| `APP_ENV` | `production` |
| `PORT` | `3000` |
| `APP_URL` | `https://flixcam.rent` |
| `NEXTAUTH_URL` | `https://flixcam.rent` |
| `NEXT_PUBLIC_APP_URL` | `https://flixcam.rent` |
| `DATABASE_URL` | `postgresql://.../flixcam_production` |

Create DB if needed:

```bash
sudo -u postgres createdb flixcam_production
```

---

## 4. Install and build

```bash
cd /home/flixcam/public_html/app
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
npm run build
```

---

## 5. Web server (Nginx or Apache)

### Nginx

```bash
sudo cp /home/flixcam/shared/nginx/production.conf /etc/nginx/conf.d/flixcam-production.conf
# Edit server_name and ssl paths if needed
sudo nginx -t
sudo systemctl reload nginx
```

If you run staging/dev, add separate vhosts and ports intentionally.

### Apache (alternative)

Use the single production proxy from `scripts/vps-migration/flixcam.conf.example` (proxy to port 3000). For staging/dev, add more VirtualHosts proxying to 3001 and 3002.

---

## 6. PM2

```bash
pm2 start /home/flixcam/pm2/ecosystem.config.js --update-env
pm2 save
pm2 startup
# Run the command it prints (sudo env PATH=...)
```

---

## 7. Cron (replace Vercel crons)

Use **Authorization: Bearer &lt;CRON_SECRET&gt;** (same value as in `.env.production`):

```cron
# Production crons
0   * * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://flixcam.rent/api/cron/booking-reminders
0   * * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://flixcam.rent/api/cron/return-reminders
0   8 * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://flixcam.rent/api/cron/overdue-alerts
0   0 * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://flixcam.rent/api/cron/waitlist-expiry
0   9 * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://flixcam.rent/api/cron/invoice-overdue

# DB backup (daily)
0   2 * * * /home/flixcam/scripts/backup-db.sh production
```

---

## 8. Quick commands

| Action | Command |
|--------|--------|
| Deploy production | `cd /home/flixcam && ./scripts/deploy.sh production` |
| Backup DB | `./scripts/backup-db.sh production` |
| Health check | `./scripts/health-check.sh` |
| PM2 logs (production) | `pm2 logs flixcam-production` |
| Restart production | `pm2 restart flixcam-production` |
| Restart all | `pm2 restart all` |

---

## 9. Deploy script (from local) and server path

Default path is `/home/flixcam/public_html/app`.

- Default:
  `./scripts/deploy-to-hostinger.sh --build`
- Override if needed:
  `SERVER_APP_PATH=/custom/path ./scripts/deploy-to-hostinger.sh --build`

---

## 10. Path reference

| Purpose | Path |
|---------|------|
| Production app (default) | `/home/flixcam/public_html/app/` |
| Env file | `/home/flixcam/public_html/app/.env` |
| Shared uploads | `/home/flixcam/shared/uploads/` |
| Backups | `/home/flixcam/shared/backups/daily/`, `weekly/` |
| PM2 config | `/home/flixcam/pm2/ecosystem.config.js` |
| Logs | `/home/flixcam/logs/production/` |
| Git bare repo | `/home/flixcam/repos/flixcam.git/` |
