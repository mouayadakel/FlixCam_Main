---
name: schema-guardian
description: Guards database schema changes. Categorizes changes (safe/caution/breaking), assesses data impact, generates migration plan and rollback. Use for any schema.prisma changes, when user mentions database/model/migration, or before running prisma migrate.
---

# Database Schema Change Guardian

## When to Trigger

- ANY changes to schema.prisma
- When user mentions "database", "model", "migration"
- Before running `prisma migrate`

## What to Do

### Step 1: Categorize the Change

- **Safe**: Adding optional field
- **Caution**: Adding required field (needs default)
- **Breaking**: Removing field, changing type, renaming

### Step 2: Data Impact Assessment

Consider: record counts, nulls, type compatibility. Use SQL/Prisma to check affected records where useful.

### Step 3: Generate Migration Plan

Output:

```markdown
## Schema Change Analysis

### Change Type: [SAFE/CAUTION/BREAKING]

### What's Changing:

- Model: [name]
- Field: [name]
- Change: [description]

### Data Impact:

- Existing records: [count]
- Records that need update: [count]
- Null values found: [count]

### Migration Strategy:

[Prisma steps and code snippets]

### Files to Update:

- [ ] [list app/service files that use this field]

### Rollback Plan:

[SQL or steps to revert if needed]

### Warnings:

- Postgres enums are hard to modify
- Test in development first
```

For breaking changes (e.g. Decimal → Int, removing fields), warn about data loss and business impact; recommend alternatives (new field + migration, keep type, separate table). Ask confirmation before proceeding.
