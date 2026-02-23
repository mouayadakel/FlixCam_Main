# Contributing to FlixCam.rent

Thank you for your interest in contributing to FlixCam.rent. Please follow these guidelines.

## Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/flixcam-rent.git
   cd flixcam-rent
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration (DATABASE_URL, NEXTAUTH_SECRET, etc.)
   ```

4. **Set up the database**

   ```bash
   npx prisma migrate dev
   npm run db:seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

## Branch Naming

- `feature/` – New features (e.g. `feature/booking-calendar`)
- `fix/` – Bug fixes (e.g. `fix/payment-webhook`)
- `chore/` – Maintenance (e.g. `chore/update-deps`)

## Pull Request Process

1. Target the `dev` branch (or `main` if no dev branch exists).
2. Provide a clear description of the changes.
3. Ensure tests pass (`npm run test`).
4. Require at least one approval before merging.

## Code Style

- Follow the conventions in [`.cursorrules`](.cursorrules).
- Use Prettier and ESLint (run `npm run lint` before committing).
- Use TypeScript for all code.
- Prefer server components; use `'use client'` only when needed.
- Use the service/policy/validator layers for business logic.
