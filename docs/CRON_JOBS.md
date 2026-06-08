# FlixCam Cron Jobs

All scheduled jobs are HTTP endpoints protected by `CRON_SECRET`. VPS cron invokes them via `scripts/cron-invoke.sh`.

## Install on VPS

```bash
cd /home/flixcam.rent
sudo ./scripts/install-vps-cron.sh
sudo bash scripts/setup-pm2-logrotate.sh   # once
```

## Dispatcher

New jobs use a unified route:

```
GET /api/cron/run/:job
Authorization: Bearer <CRON_SECRET>
```

List all jobs: `GET /api/cron/run/unknown` returns `available` slugs.

## Job registry

| Job slug | Frequency | Description |
|----------|-----------|-------------|
| `payment-retry` | Every minute | Retry failed/pending Moyasar payments (exponential backoff, max 4) |
| `notification-queue` | Every minute | Drain in-process notification queue |
| `session-cleanup` | Every minute | Expire carts and price locks |
| `rental-status-updates` | Every 5 min | CONFIRMED→ACTIVE, RETURNED→CLOSED, soft-lock release |
| `inventory-sync` | Every 5 min | Recalculate `quantityAvailable` from active bookings |
| `redis-cleanup` | Every 5 min | Expire stale Redis keys without TTL |
| `late-return-detection` | Hourly | Compute late fees for overdue ACTIVE rentals |
| `auto-extend-offers` | Hourly | Offer 24h extensions when equipment is available |
| `order-notifications` | Hourly | Status-change notifications for recent bookings |
| `payment-reconciliation` | Daily 01:00 | Match Moyasar SUCCESS payments to ledger |
| `daily-revenue-report` | Daily 04:00 | Store revenue metrics in audit log |
| `equipment-utilization` | Daily 04:00 | Utilization by category |
| `user-activity-summary` | Daily 04:00 | New/repeat/churn customer metrics |
| `email-digest` | Daily 05:00 | Admin daily summary email |
| `team-notifications` | Daily 05:00 | Ops alerts (pending orders, overdue, low stock) |
| `wallet-settlements` | Daily 06:00 | Flag vendor payouts ready for settlement |
| `sms-otp-cleanup` | Daily 07:00 | Purge old SMS logs and verified OTPs |
| `sitemap-rebuild` | Daily 08:00 | Revalidate sitemap |
| `schema-refresh` | Daily 08:00 | Revalidate structured data pages |
| `product-feeds` | Daily 08:00 | Export Google Shopping + Facebook CSV |
| `equipment-specs-validation` | Daily 10:00 | Catalog gap scan (AI backfill queue) |
| `ticket-escalation` | Daily 11:00 | Escalate stale booking requests |
| `seasonal-promos` | Daily 12:00 | Activate/deactivate coupons by date |
| `ga4-sync` | Daily 13:00 | GA4 sync audit (real-time tagging is primary) |
| `database-maintenance` | Weekly Sun 03:00 | ANALYZE key tables |
| `pdpl-archive` | Weekly Sun 04:00 | Archive old audit logs |
| `security-scan` | Weekly Sun 05:00 | Placeholder checks + npm audit |
| `monthly-invoices` | Monthly 1st 06:00 | Generate missing invoices for closed bookings |
| `credential-rotation-check` | Monthly 1st 07:00 | Quarterly rotation reminder |

## Legacy routes (still used)

- `/api/cron/moyasar-webhooks` — webhook retry queue
- `/api/cron/reminders` — WhatsApp pickup/return/overdue
- `/api/cron/booking-reminders`, `return-reminders`, `overdue-alerts`
- `/api/cron/invoice-overdue`, `abandoned-carts`, `cleanup-pending-users`
- `/api/cron/backfill`, `publish-scheduled-blog`, `waitlist-expiry`

## Health watchdog

`scripts/health-watchdog.sh` curls `/api/health` every 5 minutes and restarts PM2 (`flixcam-rent`) on failure (max 3/hour).

## Manual test

```bash
source /etc/flixcam.cron.env
curl -H "Authorization: Bearer $CRON_SECRET" https://flixcam.rent/api/cron/run/health-check
```
