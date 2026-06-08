# Pre-Opening Manual Smoke Checklist

Run automated checks first:

```bash
cd /home/flixcam.rent
npm run verify:production
npm run verify:catalog
npm run verify:payment-readiness -- --require-moyasar
BASE_URL=https://flixcam.rent npm run verify:production:http
```

**Last automated run (2026-06-06):** all checks passed — production 16/16, catalog **186/186**, HTTP smoke 21/21 on `https://flixcam.rent`.

Install VPS cron (once, as root):

```bash
sudo ./scripts/install-vps-cron.sh
```

## Customer flows (ar + en)

- [ ] Browse `/equipment` and open a product detail page
- [ ] Add item to cart; empty cart shows continue-shopping CTA
- [ ] Guest checkout on `/cart` — terms checkbox blocks pay until checked
- [ ] Moyasar test payment completes; booking status becomes CONFIRMED
- [ ] Register with phone OTP (login or sign-in with number)
- [ ] Portal `/portal/dashboard` renders in English when locale cookie is `en`
- [ ] Download invoice PDF from portal bookings

## Admin / ops

- [ ] Admin login (+ 2FA if enabled for staff)
- [ ] Warehouse check-out / check-in at `/admin/ops/warehouse`
- [ ] Scan barcode for a real `InventoryItem`
- [ ] Create/view booking in `/admin/bookings`

## Integrations

- [ ] WhatsApp OTP or notification delivers to test number
- [x] Moyasar webhook retry cron returns 401 without `CRON_SECRET`
- [x] `/api/cron/cleanup-pending-users` returns 401 without secret
- [x] VPS crontab installed (`/etc/cron.d/flixcam`) — `sudo ./scripts/install-vps-cron.sh`
- [x] Cron with valid secret returns 200 (`booking-reminders`)

## Infrastructure

- [x] PM2: `flixcam-rent` and `flixcam-workers` running
- [x] VPS crontab installed from `scripts/vps-crontab.flixcam.example`
- [x] Daily DB backup cron at 03:00 in `/etc/cron.d/flixcam`
- [ ] Sentry receives a test error — set `SENTRY_DSN` in `.env`, then run `npm run sentry:test`
