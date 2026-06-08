# Owner Actions Checklist (Post-Remediation)

These steps require production credentials and cannot be completed by automation alone.

## Quick verify (run on VPS after deploy)

```bash
cd /home/flixcam.rent
npm run verify:production              # env + DB + seeds
BASE_URL=https://flixcam.rent npm run verify:production:http   # HTTP smoke (app must be up)
```

Deploy scripts (`deploy.sh`, `deploy-no-test.sh`) now run footer/chatbot seeds and `verify:production` automatically after `pm2 restart`.

---

## 1. Credential rotation

Rotate all secrets that were ever present in git backups or `.env` samples:

- [ ] `AUTH_SECRET` / NextAuth secret — generate new, update hosting env, redeploy
- [ ] Database `DATABASE_URL` password (if exposed)
- [ ] Moyasar live keys (`MOYASAR_SECRET_KEY`, `MOYASAR_PUBLISHABLE_KEY`)
- [ ] TAP / payment gateway API keys in DB + env
- [ ] Twilio / WhatsApp (`TWILIO_*`)
- [ ] SendGrid / email API keys
- [ ] Redis / Upstash tokens
- [ ] S3 or media storage keys (if any)

Generate a new auth secret:

```bash
openssl rand -base64 32
```

After rotation: smoke-test login, checkout payment (test mode first), WhatsApp OTP, email send.

---

## 2. Footer CMS re-seed (404 links fix)

If footer columns still show broken links:

```bash
cd /home/flixcam.rent
npm run db:seed:footer
```

Idempotent — skips if `FooterSettings` already exists. To force refresh, clear footer tables in admin or DB first.

---

## 3. Chatbot settings seed

```bash
npx tsx scripts/seed-chatbot-settings.ts
```

Ensures `ChatbotSettings` exists for `/api/public/chatbot/settings` and the public chat widget.

Set in production `.env`:

```bash
NEXT_PUBLIC_PUBLIC_CHAT_ENABLED="true"
NEXT_PUBLIC_WHATSAPP_NUMBER="966508020033"   # your number
```

---

## 4. Git history purge (optional, destructive)

If `.env` backups were committed historically, purge after rotation:

```bash
# Review first — requires owner approval
git filter-repo --path-glob '*.env*' --invert-paths
# OR BFG Repo-Cleaner for specific files
```

Then force-push all branches/tags and invalidate old clones. Coordinate with team before running.

---

## 5. Production verification

Automated checks (`verify:production`):

- Required env vars (`DATABASE_URL`, auth secret, URLs, `CRON_SECRET`, `ENCRYPTION_KEY` in prod)
- Migrations up to date
- Footer + chatbot seeds present
- Optional HTTP: `/api/health`, `/`, chatbot settings, `/cart`, portal redirect

Manual browser checks:

- [ ] Guest checkout on `/cart` (no login)
- [ ] Deposit release on booking return (admin booking detail)
- [ ] Warehouse barcode scan on check-out / check-in
- [ ] Admin 2FA login for staff accounts
- [ ] Portal invoice download from bookings list
- [ ] Mobile Lighthouse: `node scripts/lighthouse-audit.js` (local Chrome)

E2E smoke (local/CI with app running):

```bash
npm run build && npm start &
BASE_URL=http://localhost:3000 npm run test:e2e -- e2e/pages-smoke.spec.ts
```

---

## 6. Deploy note (build)

Production build must use webpack (Turbopack fails on missing optional deps):

```json
"build": "next build --webpack"
```

After code pull on VPS: `npm ci && npm run build && pm2 restart all`
