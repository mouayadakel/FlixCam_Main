# FlixCamFinal – Full setup and build sequence

Exact steps from the project README and `docs/`. Run in order.

---

## 1. Start PostgreSQL (required first)

**Option A – Docker (recommended)**

```bash
cd /Users/mohammedalakel/Desktop/WEBSITE/FlixCamFinal
docker compose up -d
# Wait ~10 seconds for Postgres to be ready
```

**Option B – Local Postgres**

- Ensure PostgreSQL 14+ is running on `localhost:5432`.
- Create DB: `createdb flixcam_rent`
- In `.env`, set `DATABASE_URL` to your connection string (user/password/host/port/db).

---

## 2. Environment

`.env` is already created from `.env.example` with:

- `DATABASE_URL="postgresql://flixcam:flixcam_dev_password@localhost:5432/flixcam_rent?schema=public"` (matches `docker-compose.yml`)
- `AUTH_SECRET` and `NEXTAUTH_SECRET` set

Edit `.env` if you use a different database or host.

---

## 3. Full sequence (one command)

With Postgres running, from the project root:

```bash
./scripts/full-setup-and-build.sh
```

This runs in order:

1. (If Docker is available) Start Postgres via `docker compose up -d` and wait.
2. `npx prisma generate`
3. `npx prisma migrate dev --name setup`
4. `npm run db:seed`
5. `npm run build`

---

## 4. Or run steps manually

```bash
cd /Users/mohammedalakel/Desktop/WEBSITE/FlixCamFinal

# 1. Dependencies (if not done)
npm install

# 2. Prisma client
npx prisma generate

# 3. Migrations (requires Postgres running)
npx prisma migrate dev --name setup

# 4. Seed
npm run db:seed

# 5. Build
npm run build
```

---

## 5. After a successful build

- **Production:** `npm run start`
- **Development:** `npm run dev` → http://localhost:3000
- **Admin login (after seed):** email `admin@flixcam.rent` / password `admin123`

---

## Summary

1. Start Postgres (`docker compose up -d` or local).
2. Run `./scripts/full-setup-and-build.sh` (or the manual steps above).
3. Use `npm run start` or `npm run dev` and log in with the seeded admin user.
