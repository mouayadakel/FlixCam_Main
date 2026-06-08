# Cron Phases 6–10 — Implementation Guide

## Phase 6 — Alerting & observability

| Job | Schedule | Description |
|-----|----------|-------------|
| `cron-health-alerts` | */15 | Email/Slack when jobs stale or failed |
| `dead-letter-review` | Hourly | Alert when DLQ exceeds threshold |
| `infrastructure-health` | Daily 07:00 | Report Redis/Upstash/S3/backup config |

**Env:** `SLACK_WEBHOOK_URL` or `CRON_ALERT_SLACK_WEBHOOK`, `DLQ_ALERT_THRESHOLD=10`, `SENTRY_DSN`

**Admin:** `/admin/ops/cron` — 7-day history chart

## Phase 7 — Commerce & growth

| Job | Schedule | Description |
|-----|----------|-------------|
| `feed-validation` | Daily 08:30 | Validate Google/Facebook feeds |
| `waitlist-availability` | Hourly | Notify when equipment back in stock |
| `review-request` | Daily 15:00 | Post-return review emails |
| `low-stock-alerts` | Daily 05:00 | Admin alert for low inventory |
| `abandoned-cart-tiered` | Every 6h :30 | WhatsApp at 1h / 24h / 72h |

## Phase 8 — Finance

| Job | Schedule | Description |
|-----|----------|-------------|
| `zatca-invoice-sync` | Daily 01:00 | Generate ZATCA QR for pending invoices |
| `auto-refund-cancelled` | Daily 02:00 | Refund cancelled bookings (policy window) |
| `invoice-dunning` | Daily 10:00 | Escalating overdue reminders |
| `vendor-statements` | Monthly 1st 08:00 | Email vendor payout summaries |

**Env:** `AUTO_REFUND_POLICY_HOURS=48`, `WALLET_AUTO_APPROVE_PAYOUTS=false`

## Phase 9 — Infrastructure

- `BULLMQ_REDIS_URL` — optional dedicated Redis for queues
- `S3_*` / `R2_*` — object storage (see `src/lib/storage/object-storage.ts`)
- `scripts/setup-staging-env.sh` — staging template
- `scripts/migrate-photos-to-object-storage.sh` — bulk photo migration

## Phase 10 — Compliance

| Job | Schedule | Description |
|-----|----------|-------------|
| `pdpl-restore-drill` | Weekly Sun 04:30 | Verify PDPL archive readable |
| `security-scan` | Weekly | Creates remediation tickets on npm audit findings |

**UI:** Cookie consent banner (public layout), `/admin/ops/compliance`

## Install

```bash
sudo ./scripts/install-vps-cron.sh
npm run build && pm2 restart ecosystem.config.js --update-env
```
