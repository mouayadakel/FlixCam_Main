# Backup of migrations replaced by baseline

These folders were replaced by a single baseline migration `20260101000000_baseline` so that:

- `prisma migrate dev` works on a fresh/shadow database (no missing `User` table).
- The current database was baselined with `prisma migrate resolve --applied 20260101000000_baseline`.

Do not move these back into `prisma/migrations/` unless you need to restore the old migration history for a specific reason.
