# Why It Works Locally (npm run dev) But Not on Production

## The main difference

| Environment | Command | What it does |
|-------------|---------|--------------|
| **Local** | `npm run dev` | Runs **Next.js dev server**: hot reload, dev-only code, reads `.env` from project root. |
| **Production** | `npm run build` then `npm run start` | Builds once, then runs the **production server**. No hot reload. |

**On production you must not run `npm run dev`.** Use the deploy script (which runs `npm run build` and then PM2 runs `npm run start`).

---

## If the site works locally but not on the VPS after deploy

### 1. NEXTAUTH_URL must be the production URL

If `.env` on the server still has:

```env
NEXTAUTH_URL="http://localhost:3000"
```

auth will break (callbacks, cookies, redirects). Set it to your real domain, with `https` if you use SSL:

```env
NEXTAUTH_URL="https://flixcam.rent"
# or if no SSL yet:
NEXTAUTH_URL="http://your-server-ip:3000"
```

Then restart the app:

```bash
pm2 restart all
```

### 2. AUTH_SECRET must be set

NextAuth requires a secret in production. In `.env` on the server:

```env
AUTH_SECRET="your-production-secret-at-least-32-chars"
# or
NEXTAUTH_SECRET="your-production-secret-at-least-32-chars"
```

Generate one:

```bash
openssl rand -base64 32
```

### 3. .env is on the server and in the right place

PM2 runs with `cwd: '/home/flixcam.rent'`. Next.js loads `.env` from the current working directory when the process starts. So:

- `.env` must exist at `/home/flixcam.rent/.env`
- It must contain at least: `DATABASE_URL`, `NEXTAUTH_URL`, `AUTH_SECRET` (or `NEXTAUTH_SECRET`)

### 4. Build and start, not dev

Deploy must run:

```bash
npm run build
pm2 restart all   # PM2 runs "npm run start"
```

If you run `npm run dev` on the server:

- It’s the wrong mode for production (no optimizations, different behavior).
- It stops when you close the terminal unless you run it in the background.
- Use the deploy script instead so the app is built and run with `npm run start` via PM2.

### 5. Port and firewall

- `ecosystem.config.js` sets `PORT: 3000`. The app listens on that port.
- If you use Nginx or another reverse proxy, it must proxy to `http://127.0.0.1:3000` (or the correct PORT).
- Server firewall must allow the port you expose (e.g. 80/443 for the proxy, or 3000 if you open it directly).

### 6. Check that the app is actually running

On the VPS:

```bash
pm2 status
pm2 logs --lines 50
curl -I http://localhost:3000
```

If `curl` returns 200/302 and PM2 shows the app as online, the app is running; if the browser still fails, the issue is likely NEXTAUTH_URL, domain, or proxy.

---

## Quick production checklist

- [ ] `.env` exists at `/home/flixcam.rent/.env`
- [ ] `NEXTAUTH_URL` = production URL (e.g. `https://flixcam.rent`)
- [ ] `AUTH_SECRET` or `NEXTAUTH_SECRET` set (min 32 chars)
- [ ] `DATABASE_URL` points to production DB
- [ ] Deploy uses `./deploy.sh` (build + PM2 start), not `npm run dev`
- [ ] `pm2 status` shows app online
- [ ] `curl -I http://localhost:3000` returns 200 or 302
