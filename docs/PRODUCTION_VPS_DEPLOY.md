# Production VPS Deploy — FlixCam.rent (current setup)

This doc is the **single source of truth** for deploying to the live FlixCam VPS: paths, PM2 name, port, and full checklist so the site shows the latest changes after every deploy.

---

## Your VPS details (reference)

| Item | Value |
|------|--------|
| SSH | `ssh root@your-vps-ip` (or your user/host) |
| App directory | `/home/flixcam.rent` |
| Git root | `/home/flixcam.rent` (parent of FlixCam_Main) |
| Process manager | PM2 |
| PM2 app name | **flixcam-rent** (not `flixcam`) |
| App port | **3000** (not 3000) |

---

## Part 1: On your machine (before touching the VPS)

### Step 1 – Confirm code is ready

In your project root (where the repo is, e.g. where you see `package.json` / `src`):

```bash
git status
git log -1 --oneline
```

If you have local changes you want on production:

```bash
git add .
git commit -m "your message"
git push origin main
```

(Use your real remote/branch if different, e.g. `flixcam_main main`.)

### Step 2 – VPS details (for reference)

See the table at the top of this doc.

---

## Part 2: On the VPS (SSH in)

### Step 3 – Go to the app and pull

```bash
cd /home/flixcam.rent
git fetch origin
git pull origin main
git log -1 --oneline
```

Note the commit hash; that’s the code the server has.

### Step 4 – Install deps and Prisma

```bash
cd /home/flixcam.rent
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status
```

Fix any migration errors before continuing.

### Step 5 – Clean build (so UI/code changes show)

```bash
cd /home/flixcam.rent
rm -rf .next
npm run build
```

Wait until it finishes. If it fails, fix the reported errors (env, Node version, etc.).

### Step 6 – Restart the app (PM2, your app name and port)

```bash
pm2 restart flixcam-rent
pm2 list
```

(You use **flixcam-rent**, not `flixcam`.)

### Step 7 – Check health (port 3000)

```bash
curl -s http://localhost:3000/api/health
```

Expect something like: `{"status":"ok","db":"connected"}`. If not, check `pm2 logs flixcam-rent`.

### Step 8 – Fix production .env (blog and features)

On the VPS, open the app’s `.env`:

```bash
nano /home/flixcam.rent/.env
```

Set/verify (keep existing real secrets; only fix placeholders or wrong values):

- **App URL / Auth** (must match your live site):
  - `NEXTAUTH_URL="https://flixcam.rent"`
  - `APP_URL="https://flixcam.rent"`
  - `NEXT_PUBLIC_APP_URL="https://flixcam.rent"`

- **Port** (optional; PM2 ecosystem already sets 3000):
  - `PORT=3000`

- **Supabase** (if you use it for blog/auth/storage):
  - `NEXT_PUBLIC_SUPABASE_URL` → real project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → real anon key
  - `SUPABASE_SERVICE_ROLE_KEY` → real service role key

- **Feature flags** (if your code uses them for blog/new UI):
  - Add or set e.g. `ENABLE_BLOG="true"` if the app expects it.

- **Tap** (only if you use payments in production):
  - `TAP_SECRET_KEY`, `TAP_PUBLIC_KEY`, `TAP_WEBHOOK_SECRET` with live keys.

- **Email** (only if you need signup/notifications):
  - `SMTP_*` with real host/port/user/password.

Save and exit (nano: Ctrl+O, Enter, Ctrl+X).

Then restart so the process loads the new env:

```bash
pm2 restart flixcam-rent
```

If you changed any `NEXT_PUBLIC_*` or other build-time env, rebuild and restart:

```bash
cd /home/flixcam.rent
npm run build
pm2 restart flixcam-rent
```

### Step 9 – Confirm in the browser

Open **https://flixcam.rent** in a private/incognito window (or hard refresh: Ctrl+Shift+R / Cmd+Shift+R).

Check: homepage, blog (if you have one), control panel (admin), equipment.

If something is still missing, it’s likely env (e.g. Supabase or a feature flag) or DB content.

---

## Part 3: So it stays fixed (every future deploy)

### Step 10 – Full deploy after every pull

On the VPS, every time you pull new code, run the full sequence. Your app uses port **3000** and PM2 name **flixcam-rent**, so `scripts/deploy.sh` (which uses port 3000 and `flixcam`) doesn’t match. Use this block:

```bash
cd /home/flixcam.rent
git pull origin main
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart flixcam-rent
sleep 4
curl -s http://localhost:3000/api/health
```

**Never** only `git pull` without build + restart if you want new changes to appear.

### Step 11 – Optional: one-command deploy

On the VPS you can add an alias (e.g. in `~/.bashrc`):

```bash
alias deploy-flixcam='cd /home/flixcam.rent && git pull origin main && npm ci --omit=dev && npx prisma generate && npx prisma migrate deploy && npm run build && pm2 restart flixcam-rent && sleep 4 && curl -s http://localhost:3000/api/health'
```

Then after SSH you run:

```bash
deploy-flixcam
```

---

## Quick reference (your setup)

| Goal | Command / action |
|------|-------------------|
| Deploy latest code | On VPS: `cd /home/flixcam.rent` → `git pull origin main` → `npm ci --omit=dev` → `npx prisma generate` → `npx prisma migrate deploy` → `npm run build` → `pm2 restart flixcam-rent`. |
| Blog/features missing | Fix `.env` on VPS: real Supabase keys (if used), `APP_URL`/`NEXTAUTH_URL`/`NEXT_PUBLIC_APP_URL` = `https://flixcam.rent`, and any `ENABLE_*` flags. Then `pm2 restart flixcam-rent` (and rebuild if you changed `NEXT_PUBLIC_*`). |
| Still old after deploy | Ensure you ran `npm run build` and then `pm2 restart flixcam-rent`; confirm PM2 is running from that app directory. |
| Check what’s running | `pm2 list`; `pm2 logs flixcam-rent`; `curl -s http://localhost:3000/api/health`. |

---

## Single copy-paste block (full deploy, no .env edit)

Use this after SSH for a full deploy (Steps 3–7 and 10). Do Step 8 (.env) separately if blog/features still don’t work, then Step 9 in the browser to confirm.

```bash
cd /home/flixcam.rent
git fetch origin && git pull origin main
git log -1 --oneline
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status
rm -rf .next && npm run build
pm2 restart flixcam-rent
sleep 4
curl -s http://localhost:3000/api/health
```
