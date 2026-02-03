# Technology Stack

## Frontend

### Core Framework
- **Next.js 14** (App Router)
  - Server Components by default
  - Client Components when needed
  - API routes for backend
  - Built-in optimization

### UI Framework
- **React 18+** with TypeScript
  - Type-safe components
  - Server Components support
  - Concurrent features

### Styling
- **Tailwind CSS**
  - Utility-first CSS
  - Design tokens
  - Responsive design
  - Dark mode support

### Component Library
- **Shadcn UI**
  - Accessible components
  - Customizable
  - Built on Radix UI
  - Tailwind CSS integration

### State Management
- **Zustand** (global state)
  - Lightweight
  - TypeScript support
  - Simple API

- **TanStack Query** (server state)
  - Data fetching
  - Caching
  - Synchronization

### Form Handling
- **React Hook Form**
  - Performance
  - Validation integration
  - TypeScript support

- **Zod**
  - Schema validation
  - Type inference
  - Runtime validation

## Backend

### Runtime
- **Node.js 18+**
  - LTS version
  - ES modules support

### Database
- **PostgreSQL 14+**
  - Relational database
  - ACID compliance
  - JSON support

### ORM
- **Prisma**
  - Type-safe database client
  - Migration system
  - Query builder

### Authentication
- **NextAuth.js v5**
  - Next.js integration
  - Multiple providers
  - Session management

## Development Tools

### Code Quality
- **ESLint**
  - Code linting
  - Next.js config
  - TypeScript support

- **Prettier**
  - Code formatting
  - Tailwind plugin
  - Consistent style

### Git Hooks
- **Husky**
  - Git hooks
  - Pre-commit checks

- **lint-staged**
  - Staged file linting
  - Format on commit

### Type Checking
- **TypeScript**
  - Strict mode
  - Type safety
  - Path aliases

## Infrastructure

### Development
- **Docker Compose**
  - Local PostgreSQL
  - Easy setup

### Production (TBD)
- **Database**: Supabase / Neon / Railway
- **Hosting**: Vercel / Railway
- **Storage**: Local (Phase 1), Cloud (Phase 2)

### CI/CD
- **GitHub Actions**
  - Automated testing
  - Deployment workflows
  - Branch protection

## Third-Party Services

### Payments
- **Tap Payments**
  - Payment gateway
  - Webhook integration
  - Refund support

### Email
- **Configurable SMTP**
  - Gmail
  - Hotmail/Outlook
  - Custom SMTP

### WhatsApp
- **WhatsApp Cloud API**
  - Business messaging
  - Notifications

### Analytics (Phase 2)
- **Google Tag Manager**
- **Google Analytics 4**
- **Meta Pixel**

### AI (Phase 2)
- **OpenAI** (GPT-4)
- **Google Gemini** (alternative)

## Package Management

- **npm** or **yarn**
- **package.json** with workspaces (if needed)

## Version Control

- **Git**
- **GitHub**
  - Branch protection
  - PR workflow
  - Issue tracking

## Environment Variables

See `.env.example` for all required environment variables.

## Development Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "format": "prettier --write .",
  "type-check": "tsc --noEmit"
}
```

---

**Last Updated**: January 26, 2026
