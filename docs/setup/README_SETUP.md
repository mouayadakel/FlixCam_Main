# FlixCam.rent - Quick Setup Guide

## ✅ What's Already Done

- ✅ Next.js 14 project initialized
- ✅ TypeScript configured
- ✅ Prisma schema created (16 models)
- ✅ Admin panel UI complete (9 pages)
- ✅ Authentication configured (NextAuth.js v5)
- ✅ All components built and tested
- ✅ Environment file created (`.env`)

## 🚀 Quick Start

### 1. Install Dependencies (if not done)

```bash
npm install
```

### 2. Set Up Database

**Option A: Using Docker (Recommended)**

```bash
# Start PostgreSQL
docker compose up -d

# Wait a few seconds for database to start
sleep 5

# Run setup script
./scripts/setup-database.sh
```

**Option B: Using Local PostgreSQL**

1. Create database: `createdb flixcam_rent`
2. Update `.env` with your connection string
3. Run: `./scripts/setup-database.sh`

**Option C: Using Cloud Database (Supabase/Neon)**

1. Create PostgreSQL database
2. Get connection string
3. Update `.env` DATABASE_URL
4. Run: `./scripts/setup-database.sh`

### 3. Start Development Server

```bash
npm run dev
```

### 4. Access the Application

- **Home**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Admin Dashboard**: http://localhost:3000/admin/dashboard (after login)

### 5. Default Credentials

After database seeding:

- **Email**: `admin@flixcam.rent`
- **Password**: `admin123`

## 📋 Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:generate  # Generate Prisma Client
npm run db:migrate   # Run migrations
npm run db:push      # Push schema changes
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio

# Code Quality
npm run lint         # Run ESLint
npm run format       # Format code
npm run type-check   # TypeScript check
```

## 🗄️ Database Status

Check database connection:

```bash
curl http://localhost:3000/api/test
```

If you see `database_not_configured`, you need to set up the database.

## 🔧 Troubleshooting

### "MissingSecret" Error

✅ **Fixed** - `.env` file created with `AUTH_SECRET`

### "Can't reach database server"

- Make sure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Verify connection string is correct

### "Environment variable not found: DATABASE_URL"

- Ensure `.env` file exists in project root
- Check that `DATABASE_URL` is set in `.env`

## 📁 Project Structure

```
src/
├── app/                    # Next.js pages
│   ├── admin/             # Admin panel
│   ├── (auth)/            # Auth pages
│   └── api/               # API routes
├── components/            # React components
│   ├── admin/             # Admin components
│   ├── layouts/           # Layout components
│   ├── ui/                # Shadcn UI
│   └── ...
└── lib/                   # Business logic
    ├── services/          # Services
    ├── policies/          # Authorization
    ├── auth/              # Authentication
    └── ...
```

## 🎯 Next Steps

1. **Set up database** (see above)
2. **Test login** with admin credentials
3. **Explore admin panel** at `/admin/dashboard`
4. **Continue with Phase 3** (Core Business Services)

---

**Status**: Phase 1 & 2 Complete ✅  
**Ready for**: Database setup → Phase 3 implementation
