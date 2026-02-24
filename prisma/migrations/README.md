# Prisma migrations

Migrations are applied in **folder name order** (lexicographic). Do not edit migration SQL files after they have been applied in any environment.

## Locale migrations (Feb 2022)

- `20260221_add_locale_fields` — applied first (shorter timestamp).
- `20260221095309_add_locale_fields` — applied second (adds/fine-tunes locale fields).

Both are intentional and already applied; do not remove or rename. New schema changes should go in new migration folders.
