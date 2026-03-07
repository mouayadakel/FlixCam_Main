---
name: database-query-optimizer
description: Suggests query optimizations: fix N+1, add indexes, reduce over-fetching. Use when slow queries (>100ms), N+1, or missing indexes are suspected.
---

# Database Query Optimizer

## When to Trigger

- Slow query detected (>100ms)
- N+1 query pattern
- Missing index

## What to Do

1. **N+1**: Replace loop of findUnique/findMany with single findMany + include or select; show before/after query count.
2. **Indexes**: Suggest @@index on filtered/sorted columns and composite for common where clauses; add via migration.
3. **Over-fetching**: Use select/include only needed fields and relations; avoid deep nested includes that aren’t used.
4. **Pagination**: Add skip/take or cursor for list endpoints.

Use Prisma best practices; don’t break existing behavior. Suggest one change at a time and re-measure if needed.
