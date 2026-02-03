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

# Run migrations
npx prisma migrate dev

# Seed the database
npx prisma db seed
```

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

## Documentation

See `/docs` folder for comprehensive documentation:
- `PRD.md` - Product requirements
- `ARCHITECTURE.md` - System architecture
- `ROLES_AND_SECURITY.md` - Security doctrine
- `BOOKING_ENGINE.md` - Booking workflow
- And more...

## Contributing

1. Create a feature branch from `dev`
2. Make your changes
3. Submit a PR to `dev` (requires 1 approval)
4. After approval, merge to `main` (requires PR + approval)

## License

Proprietary - All rights reserved

## Contact

For questions or support, contact the development team.
