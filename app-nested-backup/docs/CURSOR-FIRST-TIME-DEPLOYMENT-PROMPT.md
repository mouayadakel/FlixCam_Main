# Cursor Prompt: FlixCam First-Time Production Deployment (Phased)

> Deprecated guidance document.
> Canonical source of truth is `app/.cursorrules`.
> If any instruction here conflicts with `.cursorrules`, use `.cursorrules`.

Use this prompt in Cursor to verify and prepare the repo for first-time production deployment. Execute each phase in order and report status before moving to the next.

---

## PHASE 0: PRE-FLIGHT (Local)

**Goal:** Repo is deployment-ready.

- Verify branch is `main` (or `master`) and working tree clean.
- Verify `scripts/vps-migration/` contains: `flixcam-migration.sh`, `deploy.sh`, `backup-db.sh`, `first-time-setup.sh`, `health-check.sh`, `switch-env.sh`, `ecosystem.config.js`, `nginx/production.conf`, `nginx/staging.conf`, `nginx/dev.conf`.
- Verify `docs/` contains: `FLIXCAM-VPS-GUIDE.md`, `FIRST-TIME-DEPLOYMENT.md`.
- Verify `package.json` has scripts: `build`, `start`, `db:seed` (or `tsx prisma/seed.ts` in prisma.seed).

**Report:** ✅ Phase 0 complete / ⚠️ Issues found

---

## PHASE 1: PRODUCTION ENV TEMPLATE (Local)

**Goal:** `.env.production.template` exists and lists all required variables.

- Ensure `.env.production.template` exists in repo root (or `app/` if repo root is parent).
- It must include at least: `NODE_ENV`, `APP_ENV`, `PORT`, `APP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `CRON_SECRET`, `ENCRYPTION_KEY`, and placeholders for all services (Supabase, payments, email, storage, Redis, etc.).
- Placeholders: `DATABASE_URL=postgresql://flixcam_user:CHANGE_PASSWORD@localhost:5432/flixcam_production?schema=public`, and `GENERATE_WITH_openssl_rand_base64_32` for secrets.
- Verify `prisma/seed.ts` exists (or `prisma/seed.js`).

**Report:** ✅ Phase 1 complete / ⚠️ Missing variables

---

## PHASE 2: COMMIT AND PUSH (Local)

**Goal:** All deployment files are in the repo.

- Stage: `.env.production.template`, `scripts/vps-migration/`, `docs/FIRST-TIME-DEPLOYMENT.md`, `docs/CURSOR-FIRST-TIME-DEPLOYMENT-PROMPT.md`, any new or updated scripts.
- Commit with message: "Add first-time deployment scripts and production env template"
- Push to `main`.

**Report:** ✅ Phase 2 complete / ❌ Push failed

---

## PHASE 3–10 (On VPS)

Phases 3–10 are performed **on the VPS** after SSH. Use **docs/FIRST-TIME-DEPLOYMENT.md** as the source of steps:

- **Phase 3:** VPS system setup (Node, PostgreSQL, Nginx, PM2).
- **Phase 4:** PostgreSQL: create database `flixcam_production`, user `flixcam_user`, grant privileges.
- **Phase 5:** Pull repo (or ensure app is at `public_html/app`), run `flixcam-migration.sh`, verify structure.
- **Phase 6:** Configure production `.env` from template; generate secrets; set `DATABASE_URL`, all API keys; `chmod 600 .env`.
- **Phase 7:** Run `first-time-setup.sh` from `/home/flixcam/scripts/`; confirm all 10 steps succeed.
- **Phase 8:** Copy Nginx config, `nginx -t`, reload Nginx; run Certbot for SSL.
- **Phase 9:** Test: `pm2 status`, `curl localhost:3000`, `curl https://flixcam.rent`, browser tests (home, login, products, cart).
- **Phase 10:** Crontab for backups (`backup-db.sh production`), `pm2 startup`, document deployment.

---

## OUTPUT FORMAT (per phase)

For each phase:

- **STATUS:** ✅ Pass / ⚠️ Warning / ❌ Fail  
- **DETAILS:** What you found  
- **ISSUES:** Any problems  
- **FIXES APPLIED:** What you changed  
- **NEXT STEPS:** What must be done manually (if any)

---

## FINAL SUMMARY

After all phases:

- **Total checks:** X  
- **Passed:** X  
- **Warnings:** X  
- **Failed:** X  
- **PRODUCTION READY:** YES / NO  
- If NO: list critical blockers.  
- If YES: production URL, PM2 command, and log command.
