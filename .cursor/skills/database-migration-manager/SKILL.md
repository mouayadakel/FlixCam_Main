---
name: database-migration-manager
description: Manages Prisma migrations with naming, optional backup/rollback scripts, and changelog. Use when making schema changes or user says "create migration".
---

# Database Migration Manager

## When to Trigger

- Schema changes
- "Create migration"

## What to Do

1. **Name migration**: Descriptive, dated (e.g. add_booking_cancellation_reason_2025_02_03).
2. **Run**: `npx prisma migrate dev --name <name>` (or equivalent).
3. **Optional**: Create rollback.sql and CHANGELOG.md in migration folder; document breaking changes.
4. **Optional**: Add seed or data-migration script if new fields need backfill.

Remind to test in dev first and to backup production before applying. Follow Prisma and project migration conventions.
