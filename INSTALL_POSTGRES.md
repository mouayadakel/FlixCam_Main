# PostgreSQL Installation Guide for macOS

## Quick Install (Recommended)

### Option 1: Using Homebrew

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Create database
createdb flixcam_rent

# Or using psql:
psql postgres -c "CREATE DATABASE flixcam_rent;"
psql postgres -c "CREATE USER flixcam WITH PASSWORD 'flixcam_dev_password';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE flixcam_rent TO flixcam;"
```

### Option 2: Using Postgres.app

1. Download from: https://postgresapp.com/
2. Install and launch the app
3. Click "Initialize" to create a new server
4. The default connection is: `postgresql://localhost`

Then update `.env`:
```
DATABASE_URL="postgresql://localhost/flixcam_rent?schema=public"
```

### Option 3: Using Docker (if you install Docker Desktop)

```bash
# Install Docker Desktop from: https://www.docker.com/products/docker-desktop

# Then run:
docker compose up -d

# Wait for database to start
sleep 5
```

## After Installation

Once PostgreSQL is installed and running:

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Push schema to database
npx prisma db push

# 3. Seed the database
npm run db:seed
```

## Verify Installation

```bash
# Check if PostgreSQL is running
pg_isready

# Or test connection
psql -d flixcam_rent -c "SELECT version();"
```

## Troubleshooting

### "Can't reach database server"
- Make sure PostgreSQL is running: `brew services list` (if using Homebrew)
- Check if port 5432 is available: `lsof -i :5432`

### "Database does not exist"
- Create it: `createdb flixcam_rent`
- Or: `psql postgres -c "CREATE DATABASE flixcam_rent;"`

### Permission denied
- Check PostgreSQL user permissions
- Or use default postgres user and update `.env` accordingly

---

**Recommended**: Use Homebrew for easiest setup on macOS.
