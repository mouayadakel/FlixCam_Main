# FlixCam Project — Technical Inventory Report

**Generated:** 2026-03-07  
**Scope:** `/home/flixcam/public_html` and `/home/flixcam/public_html/FlixCamFinal 3`

---

## 1. CURRENT STRUCTURE

### 1.1 High-Level Tree (excluding `node_modules` and `__MACOSX`)

```
/home/flixcam/public_html/
├── index.html                          # Virtualmin default welcome page (NOT the app)
├── icon/                               # Virtualmin/icons (browser, clock, cpu, flags, mime, os, other)
├── FlixCamFinal 3.zip                  # ⚠️ Archive with spaces in name
└── FlixCamFinal 3/                     # ⚠️ FOLDER WITH SPACES
    ├── __MACOSX/                       # macOS metadata (safe to ignore/remove)
    └── FlixCamFinal 3/                 # ⚠️ NESTED DUPLICATE NAME — actual app root
        ├── .cursor/
        ├── .history/
        ├── .next/                      # Next.js build output (dev server cache present)
        ├── .vscode/
        ├── awstats/
        ├── coverage/                   # Jest coverage reports
        ├── docs/
        ├── node_modules/
        ├── playwright-report/
        ├── prisma/
        ├── public/
        ├── public_html/                # ⚠️ Nested public_html (contains FlixCam_Main)
        │   └── FlixCam_Main/           # App-related folder (cursorrules, route names)
        ├── reports/
        ├── scripts/
        ├── src/
        │   ├── app/                    # Next.js App Router (pages + API)
        │   ├── components/
        │   └── lib/
        ├── storage/
        │   └── uploads/                # Local uploads (when STORAGE_TYPE=local)
        ├── test-results/
        ├── testsprite_tests/
        ├── .env
        ├── .env.example
        ├── components.json
        ├── header-design-system.json
        ├── jest.config.js
        ├── next.config.js
        ├── package.json
        ├── package-lock.json
        ├── postcss.config.js
        ├── tsconfig.json
        ├── vercel.json
        └── ... (config files)
```

### 1.2 Frontend vs Backend

| Location | Role |
|----------|------|
| **Frontend** | Next.js 16 App Router in `FlixCamFinal 3/FlixCamFinal 3/src/app/` — React 19, Tailwind, Radix UI. Public routes under `(public)/`, `portal/`, `vendor/`, `warehouse/`, `account/`, `admin/`, etc. |
| **Backend** | Same Next.js app: API routes under `src/app/api/`, Server Actions, Prisma for DB. No separate Express/Fastify/PHP backend. |
| **Root `/home/flixcam/public_html/index.html`** | Virtualmin default “Website Enabled” page — not part of the FlixCam app. |

### 1.3 Duplicate or Nested Folders

- **Duplicate naming:** `FlixCamFinal 3/FlixCamFinal 3` — same name nested; actual app root is the inner `FlixCamFinal 3`.
- **Nested `public_html`:** `FlixCamFinal 3/FlixCamFinal 3/public_html/FlixCam_Main` exists inside the Next app; purpose appears to be legacy or reference (`.cursorrules` + route-like folder names), not the live document root.
- **`__MACOSX`:** macOS resource fork / metadata; can be removed from server.

### 1.4 Files/Folders with Spaces in Names

| Path | Note |
|------|------|
| `/home/flixcam/public_html/FlixCamFinal 3.zip` | Archive name has space. |
| `/home/flixcam/public_html/FlixCamFinal 3/` | Top-level folder name has space. |
| `FlixCamFinal 3/FlixCamFinal 3/` | Nested folder name has space. |
| `FlixCamFinal 3/FlixCamFinal 3/docs/Flix Stock invintory  (1).xlsx` | File name has spaces (and typo “invintory”). |
| `__MACOSX/FlixCamFinal 3/` | Metadata path with space. |

**Recommendation:** For VPS restructuring, rename to a single path without spaces, e.g. `flixcam-app` or `flixcam`, to avoid quoting and script issues.

---

## 2. TECHNOLOGY STACK

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Next.js 16 (App Router), TypeScript, Tailwind CSS, Radix UI, TanStack Query, Zustand |
| **Backend** | Next.js API routes + Server Actions (Node.js); no separate backend process |
| **Database** | PostgreSQL (Prisma ORM 5.19) |
| **Runtime** | Node.js (no `engines` in package.json; devDependencies suggest Node 20+) |
| **Package manager** | npm (package-lock.json present) |

Additional: NextAuth 5 (beta), Supabase (auth/storage), Prisma, BullMQ/ioredis for queues, Cloudinary, Resend/Twilio, Sentry, Vercel (crons in vercel.json).

---

## 3. BUILD & DEPLOYMENT

### 3.1 Build Scripts (package.json)

| Script | Command | Purpose |
|--------|---------|--------|
| `dev` | `next dev` | Default port 3000 |
| `dev:3002` | `next dev -p 3002` | Dev on port 3002 |
| `build` | `next build` | Production build |
| `start` | `next start` | Run production server |
| `deploy:hostinger` | `./scripts/deploy-to-hostinger.sh` | Git push + optional server build |
| `deploy:db` | `prisma migrate deploy` | Run migrations in production |

### 3.2 Build Output

- **Output directory:** `.next/` (Next.js; no separate `dist/` or `build/`).
- **Current state:** `.next/` exists with a `dev` subfolder (dev server cache), not necessarily a full production build.

### 3.3 Deployment Configuration

- **Vercel:** `vercel.json` defines cron routes (e.g. `/api/cron/booking-reminders`, `/api/cron/return-reminders`, etc.).
- **Hostinger VPS:**
  - `scripts/deploy-to-hostinger.sh` — pushes to `hostinger` remote, repo path `/home/flixcam/repos/flixcam.git`, server app path `SERVER_APP_PATH` (default `/home/flixcam/www`). Optional `--build` runs build + restart on server.
  - `scripts/server-build-restart.sh` — on server: `npm ci --omit=dev` or `npm install --omit=dev`, `npm run build`, then restart via **PM2** (`pm2 restart flixcam` or `pm2 restart all`) or **systemd** (`systemctl restart flixcam`).
- **SFTP (VS Code):** `.vscode/sftp.json` — Host `72.62.37.114`, remote path `/home/flixcam/public_html/app`. Note: IP differs from deploy script (`76.13.63.81`); confirm which is current.

### 3.4 Process Manager

- **Preferred:** PM2 (process name `flixcam`).
- **Fallback:** systemd service `flixcam`.
- **Script:** `scripts/server-build-restart.sh` tries PM2 first, then systemd, then instructs manual restart.

---

## 4. WEB SERVER CONFIGURATION

- **Nginx:** Global config in `/etc/nginx/nginx.conf`; no FlixCam-specific server block found in `/etc/nginx/conf.d/` (only `php-fpm.conf`). Default server serves `root /usr/share/nginx/html` on port 80.
- **FlixCam vhost:** No nginx (or Apache) config found for flixcam.rent or a Node/Next.js proxy. The app is likely reached via Virtualmin’s own web server or a different vhost not under `/etc/nginx/conf.d/`.
- **Ports:** Next.js default 3000; alternate dev 3002. No reverse proxy to these ports is visible in the checked nginx files.
- **Static files:** Next.js serves `public/` at build/runtime. Local uploads when `STORAGE_TYPE=local`: `storage/uploads/` (not necessarily exposed via nginx).

**Recommendation:** Add an nginx (or Apache) vhost that proxies to `http://127.0.0.1:3000` (or the port PM2/systemd use) and serves static/build assets as needed.

---

## 5. ENVIRONMENT FILES

### 5.1 Locations

| File | Path |
|------|------|
| `.env` | `FlixCamFinal 3/FlixCamFinal 3/.env` |
| `.env.example` | `FlixCamFinal 3/FlixCamFinal 3/.env.example` |
| History copies | `FlixCamFinal 3/FlixCamFinal 3/.history/.env_*` |

### 5.2 Variable Names (values hidden)

- **Database:** `DATABASE_URL` (PostgreSQL, format `postgresql://user:password@host:5432/flixcam_rent?schema=public`).
- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Auth:** `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
- **Cron:** `CRON_SECRET`; blog: `BLOG_PREVIEW_TOKEN`.
- **Payments:** Tap, Moyasar, MyFatoorah, Tamara, Tabby, PayTabs, HyperPay, Geidea (multiple keys per gateway).
- **Email:** Resend (`RESEND_*`), SMTP, Gmail OAuth, Hotmail OAuth.
- **WhatsApp / SMS:** `WHATSAPP_*`, `TWILIO_*`.
- **Analytics:** `GTM_CONTAINER_ID`, `GA4_MEASUREMENT_ID`, `META_PIXEL_ID`.
- **AI:** `OPENAI_API_KEY`, `OPENAI_EMBEDDINGS_MODEL`, `GEMINI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `AI_PROVIDER`, Pexels, Unsplash, Google Custom Search.
- **Redis/Queues:** `REDIS_URL`, `UPSTASH_REDIS_REST_*`.
- **Storage:** `CLOUDINARY_*`, `STORAGE_TYPE`, optional AWS S3 vars.
- **ZATCA:** `ZATCA_API_*`, `ZATCA_COMPANY_*`.
- **App:** `APP_ENV`, `APP_URL`, `APP_NAME`, `NEXT_PUBLIC_APP_URL`, feature flags (`ENABLE_*`), `ALLOWED_ORIGINS`, `LOG_LEVEL`, `ENABLE_AUDIT_LOGGING`, Sentry, `ENCRYPTION_KEY`, etc.

Full list of variable names is in `.env.example` (no sensitive values).

### 5.3 Environments

- **Configured in repo:** Development (localhost URLs in `.env.example`).
- **Production:** Expect `APP_URL` / `NEXTAUTH_URL` / `DATABASE_URL` etc. to point to production; no separate `.env.production` found in inventory.

---

## 6. DEPENDENCIES & ASSETS

### 6.1 package.json Dependencies (summary)

- **Runtime:** Next 16, React 19, Prisma, NextAuth 5, Supabase, TanStack Query, Zustand, Radix UI, FullCalendar, Recharts, ExcelJS, Cloudinary, BullMQ, ioredis, Resend, Twilio, OpenAI, Zod, etc.
- **Dev:** TypeScript, Jest, Playwright, ESLint, Prettier, Prisma, Tailwind, tsx, bundle analyzer, etc.

Exact versions are in `FlixCamFinal 3/FlixCamFinal 3/package.json`.

### 6.2 Uploads / Media Storage

- **Local:** `FlixCamFinal 3/FlixCamFinal 3/storage/uploads/` (used when `STORAGE_TYPE=local`).
- **Cloud:** Cloudinary (and optional S3) via env vars.

### 6.3 SSL

- No project-internal SSL paths found. Nginx TLS is commented in default config; certificate location would be server-level (e.g. `/etc/pki/nginx/` or Let’s Encrypt).

### 6.4 Logs

- **Next.js dev:** `.next/dev/logs`.
- **Nginx:** `/var/log/nginx/access.log`, `/var/log/nginx/error.log`.
- **App logs:** Depends on runtime (Winston etc.); no project-specific log directory listed in this inventory.

---

## 7. ENTRY POINTS

### 7.1 Backend

- **No standalone server file:** Backend is the Next.js process.
- **Start:** `npm run start` → `next start` (serves the built app and API).
- **API base:** Routes live under `src/app/api/` (e.g. `src/app/api/auth/`, `src/app/api/checkout/`, `src/app/api/cron/`, `src/app/api/footer/`, etc.). No global prefix; paths are as in the folder structure (e.g. `/api/cron/booking-reminders`).

### 7.2 Frontend

- **Root layout:** `FlixCamFinal 3/FlixCamFinal 3/src/app/layout.tsx`.
- **Root page:** Handled by App Router (e.g. `(public)` or root `page.tsx`).
- **Public HTML:** Next.js generates the single-page app; there is no static `index.html` for the app in the repo (the only `index.html` is Virtualmin’s at `/home/flixcam/public_html/index.html`).

### 7.3 API Route Prefix

- **Prefix:** `/api`.
- **Examples:** `/api/auth/*`, `/api/checkout/*`, `/api/cron/*`, `/api/footer`, etc.

---

## 8. RESTRUCTURING RECOMMENDATIONS (VPS)

1. **Single app root without spaces**  
   Move/copy the inner app to a path like `/home/flixcam/flixcam-app` or `/home/flixcam/www` and use that as the only app root (align with `SERVER_APP_PATH` in deploy script).

2. **Document root vs Node app**  
   - Keep Virtualmin’s `public_html` for the default page or a simple “under maintenance” page if needed.  
   - Run the Next.js app from a separate directory (e.g. `/home/flixcam/www`) and proxy to it (see below).  
   - Do not rely on `public_html/FlixCamFinal 3/FlixCamFinal 3` as the long-term path.

3. **Web server**  
   Add a dedicated server block (nginx or Apache) for the domain that:
   - Proxies to `http://127.0.0.1:3000` (or the port used by PM2/systemd).
   - Serves or proxies static assets as appropriate (Next.js can serve them if the proxy is correct).

4. **Process manager**  
   Ensure PM2 (or systemd) is configured to run `next start` from the chosen app root (e.g. `pm2 start npm --name flixcam -- start` with `cwd` set to that path).

5. **Env and secrets**  
   Keep `.env` only on the server, outside version control; use `.env.example` as the variable checklist. Sync production values (DB, auth, payments, etc.) into the new app path.

6. **Cleanup**  
   - Remove or archive `FlixCamFinal 3.zip` and `__MACOSX` if not needed.  
   - Rename or remove the nested `public_html/FlixCam_Main` if it’s not used by the running app.

7. **Deploy script**  
   Point `SERVER_APP_PATH` and SFTP `remotePath` to the same app directory and confirm the correct host (72.62.37.114 vs 76.13.63.81).

---

*End of Technical Inventory*
