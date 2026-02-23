# Database Setup Instructions

## Option 1: Docker (Recommended)

If you have Docker installed:

```bash
# Start PostgreSQL
docker compose up -d

# Wait for database to be ready (about 5-10 seconds)
sleep 5

# Run migrations
npm run db:migrate

# Seed the database
npm run db:seed
```

## Option 2: Local PostgreSQL

If you have PostgreSQL installed locally:

1. Create the database:

```bash
createdb flixcam_rent
# Or using psql:
psql -U postgres -c "CREATE DATABASE flixcam_rent;"
```

2. Update `.env` with your connection string:

```
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/flixcam_rent?schema=public"
```

3. Run migrations:

```bash
npm run db:migrate
```

4. Seed the database:

```bash
npm run db:seed
```

## Option 3: Cloud Database (Supabase/Neon/Railway)

1. Create a PostgreSQL database on your chosen provider
2. Get the connection string
3. Update `.env` with the connection string
4. Run migrations and seed

## Verify Setup

After setup, test the connection:

```bash
# Test API endpoint
curl http://localhost:3000/api/test

# Or check in Prisma Studio
npm run db:studio
```

## Default Admin Credentials

After seeding:

- Email: `admin@flixcam.rent`
- Password: `admin123`

---

**Note**: The `.env` file is already configured with Docker Compose credentials. If using Docker, no changes needed.
