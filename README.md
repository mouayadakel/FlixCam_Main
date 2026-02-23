# FlixCam.rent

Cinematic Equipment & Studio Rental Platform

## Project Overview

FlixCam.rent is a modern, AI-first platform for renting cinematic equipment and studios in Riyadh, Saudi Arabia. Built with Next.js 14, React, TypeScript, Prisma, and PostgreSQL.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, Prisma ORM, PostgreSQL
- **Authentication**: NextAuth.js v5
- **State Management**: Zustand (global), TanStack Query (server state)
- **Validation**: Zod schemas
- **Payments**: Tap Payments
- **Languages**: Arabic (primary), English, Chinese

## Architecture

- API-first design
- Event-driven architecture
- Service-based modules
- Policy-based authorization
- No admin bypass (security-first)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-org/flixcam-rent.git
cd flixcam-rent
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:

```bash
# Start PostgreSQL (Docker)
docker-compose up -d

# Run migrations (development – interactive)
npx prisma migrate dev

# Or apply migrations only (CI/deploy – non-interactive)
npm run db:deploy

# Seed the database
npm run db:seed
```

**Deploy (production/CI):** Run `npm run db:deploy` to apply pending migrations, then optionally `npm run db:seed`. To run both: `npm run deploy:db`.

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router
├── components/             # React Components
├── lib/                   # Core Business Logic
│   ├── services/          # Business logic
│   ├── policies/          # Authorization policies
│   ├── validators/        # Zod schemas
│   └── ...
└── prisma/                # Database
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## Deployment

1. **Set up environment variables**
   - Copy `.env.example` to `.env` and configure production values.
   - Ensure `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (or `APP_URL`), and `CRON_SECRET` are set.

2. **Run migrations**

   ```bash
   npx prisma migrate deploy
   ```

3. **Build**

   ```bash
   npm run build
   ```

4. **Start**

   ```bash
   npm run start
   ```

5. **Health check**

   ```bash
   curl http://localhost:3000/api/health
   ```

   Expect `{ "status": "ok", "db": "connected" }` when healthy.

6. **Docker (optional)**
   ```bash
   docker-compose up -d
   ```

## Documentation

All project docs are under **`docs/`**. Start from **[docs/00-README-DOCS.md](docs/00-README-DOCS.md)** for the full index.

- **Core:** `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ROLES_AND_SECURITY.md`, `docs/BOOKING_ENGINE.md`
- **Planning:** `docs/planning/` — main plans, sprints, milestones
- **Setup:** `docs/setup/` — database, Redis, Supabase, quick start
- **Audits & reports:** `docs/audits/`, `docs/reports/`, `docs/phases/`

## Contributing

1. Create a feature branch from `dev`
2. Make your changes
3. Submit a PR to `dev` (requires 1 approval)
4. After approval, merge to `main` (requires PR + approval)

## License

Proprietary - All rights reserved

## Contact

For questions or support, contact the development team.

# flixCamFinal
