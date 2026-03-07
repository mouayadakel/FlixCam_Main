# VPS Fresh Install Checklist — FlixCam.rent

Use this when doing a **clean install** of the project on a new VPS. Install the items below in order, then follow [PRODUCTION_VPS_DEPLOY.md](./PRODUCTION_VPS_DEPLOY.md) for deploy steps.

---

## 1. System basics (Ubuntu/Debian)

```bash
sudo apt update && sudo apt upgrade -y
```

- **Git** — clone/pull the repo  
  `sudo apt install -y git`

- **Build tools** — for native Node modules (optional but recommended)  
  `sudo apt install -y build-essential`

---

## 2. Node.js (20 LTS)

The project requires **Node.js 20+** (see DEPLOY.md).

```bash
# Option A: NodeSource (recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x.x
npm -v
```

```bash
# Option B: nvm (per-user, no sudo for global installs)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc   # or ~/.zshrc
nvm install 20
nvm use 20
node -v
```

---

## 3. PostgreSQL 14+

Database for Prisma (see `DATABASE_URL` in `.env`).

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE USER flixcam WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "CREATE DATABASE flixcam_rent OWNER flixcam;"
# If you need to allow local connections with password:
# Edit pg_hba.conf (e.g. add: local all flixcam md5) and restart: sudo systemctl restart postgresql
```

Set in `.env`:

```env
DATABASE_URL="postgresql://flixcam:your_secure_password@localhost:5432/flixcam_rent?schema=public"
```

---

## 4. Redis (optional but recommended)

Used for rate limiting, BullMQ job queues, and caching (`REDIS_URL` in `.env`). If you skip Redis, ensure the app does not require it for critical paths or use Upstash (cloud Redis) and set `REDIS_URL` to the Upstash URL.

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping   # PONG
```

In `.env`:

```env
REDIS_URL="redis://localhost:6379"
```

---

## 5. PM2 (process manager)

Used to run the Next.js app and keep it running (port 3001 in your setup).

```bash
sudo npm install -g pm2
pm2 startup   # run the command it prints to enable startup on boot
```

After first deploy you’ll start the app with something like:

```bash
cd /path/to/FlixCam_Main
PORT=3001 pm2 start npm --name "flixcam-rent" -- start
# or use an ecosystem.config.js / ecosystem.yml
```

---

## 6. Reverse proxy & SSL (production)

So the app is served over HTTPS (e.g. `https://flixcam.rent`) and traffic goes to your Node app on port 3001.

- **Nginx**

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
# Configure a server block that proxy_pass to http://127.0.0.1:3001
# Then: sudo certbot --nginx -d flixcam.rent
```

- **Caddy** (alternative, automatic HTTPS)

```bash
sudo apt install -y debian-keyring debian-archive-keyring curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
# Add Caddy repo and install, then configure Caddyfile to reverse_proxy to 127.0.0.1:3001
```

---

## 7. Firewall (recommended)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # or 80, 443 if not using Nginx package
sudo ufw enable
sudo ufw status
```

---

## Quick reference: what to install

| Component      | Purpose                          | Required |
|----------------|----------------------------------|----------|
| Node.js 20+    | Run Next.js app                  | Yes      |
| npm            | Install deps (comes with Node)   | Yes      |
| Git            | Clone/pull repo                 | Yes      |
| PostgreSQL 14+ | Prisma database                 | Yes      |
| Redis          | Rate limit, BullMQ, cache       | Recommended |
| PM2            | Run and keep app alive          | Yes      |
| Nginx / Caddy  | Reverse proxy + SSL             | Yes (production) |
| Certbot        | Let’s Encrypt (if using Nginx)  | Yes (production) |
| build-essential| Native Node modules             | Optional |

---

## After install: first-time app setup

1. Clone the repo (or upload/copy) to your app directory, e.g.  
   `/home/flixcam.rent/public_html/FlixCam_Main/FlixCam_Main`.

2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` (PostgreSQL)
   - `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `APP_URL`, `NEXT_PUBLIC_APP_URL`
   - `CRON_SECRET`
   - Supabase keys (`NEXT_PUBLIC_SUPABASE_URL`, etc.)
   - Optional: `REDIS_URL`, Tap, Resend/SMTP, etc.

3. **Migrations and seeds (first-time only):**
   - Run the deploy sequence from [PRODUCTION_VPS_DEPLOY.md](./PRODUCTION_VPS_DEPLOY.md) (pull, `npm ci --omit=dev`, `prisma generate`, `prisma migrate deploy`, `npm run build`, PM2 start/restart).
   - On **first deploy**, after `prisma migrate deploy`, run seeds. In production the main seed is disabled unless you set `ALLOW_SEED_IN_PRODUCTION=true` in `.env` (then run once and remove or set to false if desired):
     ```bash
     # Required for first-time: admin user, categories, brands, studios, feature flags, checkout form, etc.
     npm run db:seed
     ```
   - **Optional seeds** (run only if you need them):
     | Command | Purpose |
     |--------|---------|
     | `npm run db:seed:rbac` | RBAC roles, permissions, menu items |
     | `npm run db:seed:footer` | Footer CMS (brand, legal, social, newsletter, columns) |
     | `npm run db:seed:blog` | Blog categories, author, sample posts |
     | `npm run db:seed:lighting-subcategories` | Lighting subcategories (requires main seed first) |
     | `npx tsx scripts/seed-policies.ts` | Policy items (6 defaults + full Terms); run if admin policies page is empty |

   The main seed already runs **checkout form** seed internally; you don't need `db:seed:checkout-form` unless you're only updating that.

4. Point your domain’s DNS to the VPS and complete SSL (Certbot or Caddy).

5. Verify: `curl -s http://localhost:3001/api/health` and open `https://yourdomain.com` in a browser.
