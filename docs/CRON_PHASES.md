# Cron Phases — Complete Rollout Guide

## Phase 0 — Deploy & smoke test

```bash
cd /home/flixcam.rent
sudo bash scripts/deploy-all-phases.sh
# or step by step:
npm ci --omit=dev && npx prisma migrate deploy && npm run build
pm2 restart ecosystem.config.js --update-env
sudo ./scripts/install-vps-cron.sh
sudo bash scripts/setup-pm2-logrotate.sh
bash scripts/phase0-smoke-test.sh
```

## Phase 1 — Tier 1 stabilization

- **Done:** Duplicate reminder crons removed from VPS crontab (use `/api/cron/reminders` only)
- **Done:** BullMQ notification worker when `REDIS_URL` is set
- **Monitor:** `/admin/ops/cron` for stale/failed jobs

## Phase 2 — Finance & ops

- **Done:** Admin dashboard shows reconciliation mismatches and payout-ready entries
- **Done:** Daily `email-digest` + `team-notifications` to admins
- **Action:** Review `/admin/ops/cron` → Recon mismatches daily

## Phase 3 — SEO & catalog

- **Done:** `product-feeds` exports to `public/feeds/`
- **Done:** Google sitemap ping on `sitemap-rebuild`
- **Action:** Submit `https://flixcam.rent/feeds/google-shopping.xml` to Merchant Center

## Phase 4 — Compliance

- **Done:** `pdpl-archive` writes JSON to `PDPL_ARCHIVE_DIR` before purge
- **Done:** `security-scan` weekly + `credential-rotation-check` monthly
- **Action:** Set `PDPL_ARCHIVE_DIR` and verify backup retention policy

## Phase 5 — Hardening

| Item | Status |
|------|--------|
| 5a BullMQ notifications | ✅ `notification.worker.ts` + `flixcam-workers` |
| 5b Uptime webhook | ✅ `POST /api/webhooks/uptime` + `UPTIME_WEBHOOK_SECRET` |
| 5c Admin cron dashboard | ✅ `/admin/ops/cron` |
| 5d Auto-deploy watchdog | ✅ `WATCHDOG_AUTO_DEPLOY=true` (optional) |
| 5e GA4 Measurement Protocol | ✅ `GA4_MEASUREMENT_API_SECRET` |

### External uptime monitor setup

1. Set `UPTIME_WEBHOOK_SECRET` in `.env`
2. Point monitor at `https://flixcam.rent/api/health` (GET)
3. Webhook URL: `https://flixcam.rent/api/webhooks/uptime` with header `x-uptime-secret`

### Optional auto-deploy on outage

```bash
# In /etc/flixcam.cron.env or server env
WATCHDOG_AUTO_DEPLOY=true
```

On 2nd health failure in the same hour, runs `scripts/server-build-restart.sh`.
