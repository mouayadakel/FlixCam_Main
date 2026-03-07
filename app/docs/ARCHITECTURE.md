# System Architecture

## Architecture Overview

### Frontend

- **Next.js 14** (App Router)
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Shadcn UI** component library
- Server Components by default, Client Components when needed

### Backend

- **Node.js** with TypeScript
- **Prisma ORM** (single source of truth)
- **PostgreSQL** database
- **NextAuth.js v5** for authentication

### Infrastructure

- **Local Docker** for PostgreSQL (development)
- **Cloud database** for production (TBD: Supabase/Neon/Railway)
- **GitHub Actions** for CI/CD
- **Vercel/Railway** for deployment

## Architecture Principles

### 1. API-First Design

- All business logic in API routes
- Thin controllers, fat services
- RESTful API design
- Proper HTTP status codes

### 2. Event-Driven Architecture

- Critical actions emit events
- Decoupled event handlers
- Async processing
- Event storage in database

### 3. Service-Based Modules

- Domain-based organization
- Services over controllers
- Clear separation of concerns
- Reusable business logic

### 4. Policy-Based Authorization

- No admin bypass
- Every model has a policy
- Permission checks in services
- Audit trail for all actions

## Layer Separation

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│    (Next.js Pages & Components)     │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│           API Routes Layer           │
│    (Thin controllers, validation)    │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│          Service Layer (MAIN)        │
│    (Business logic, orchestration)  │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│         Policy Layer                 │
│    (Authorization, permissions)     │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│         Validator Layer              │
│    (Zod schemas, input validation)  │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│         Database Layer               │
│    (Prisma ORM, PostgreSQL)         │
└─────────────────────────────────────┘
```

## Data Flow

1. **Request** → API Route
2. **Validation** → Zod schema
3. **Authorization** → Policy check
4. **Business Logic** → Service method
5. **Database** → Prisma query
6. **Audit** → Log action
7. **Event** → Emit event
8. **Response** → Return result

## Security Architecture

- **No admin bypass**: Everyone goes through policies
- **Financial operations**: Require approval workflow
- **Soft delete only**: No hard deletes without approval
- **Audit logging**: All critical actions logged
- **Rate limiting**: API and auth endpoints
- **Input validation**: Zod schemas for all inputs

## Event System

- Events stored in database
- Async event handlers
- Decoupled processing
- Core events: booking.created, booking.confirmed, payment.success, contract.signed

## Database Patterns

- **Audit fields**: createdAt, updatedAt, deletedAt, createdBy, updatedBy, deletedBy (mandatory)
- **Indexes**: Foreign keys, status fields, dates, deletedAt
- **Soft delete**: All models support soft delete
- **Transactions**: Multi-step operations use transactions

## File Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes
│   ├── (dashboard)/        # Protected routes
│   ├── api/                # API routes
│   └── page.tsx            # Home page
├── components/             # React Components
│   ├── ui/                # Shadcn UI
│   ├── forms/             # Form components
│   ├── features/          # Feature components
│   └── layouts/           # Layout components
└── lib/                   # Core Business Logic
    ├── services/          # Business logic (MAIN)
    ├── policies/          # Authorization
    ├── validators/        # Zod schemas
    ├── events/            # Event system
    ├── auth/              # Authentication
    └── db/                # Database utilities
```

---

**Last Updated**: January 26, 2026
