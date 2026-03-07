---
name: dependency-chain
description: Traces dependency chains before deleting files or changing signatures. Builds dependency graph, detects circular dependencies, lists breaking points. Use when deleting files, changing function signatures, modifying database schema, or when user says "remove" or "delete".
---

# Dependency Chain Analyzer

## When to Trigger

- When deleting any file
- When changing function signatures
- When modifying database schema
- When user says "remove" or "delete"

## What to Do

### Step 1: Build Dependency Graph

Trace the chain:

```
File/Function to Change
  ↓ imported by
Component A
  ↓ used in
Page X
  ↓ linked from
Navigation Menu
  ↓ accessed by
User Role: Admin, Manager
```

### Step 2: Check for Circular Dependencies

Detect and warn about:

- A imports B, B imports A
- Component recursion
- Infinite loops in data fetching

### Step 3: List All Breaking Points

Output:

```markdown
## Dependency Chain for [item]

### Direct Dependencies (files that import this):

1. file1.ts - line 12 (imports function X)
2. file2.tsx - line 45 (uses component Y)

### Indirect Dependencies (affected downstream):

1. Page: /admin/bookings (uses file1.ts)
2. API: /api/bookings (calls this function)
3. Component: BookingCard (renders this data)

### User-Facing Impact:

- ⚠️ Bookings page will break
- ⚠️ Dashboard widget will show errors

### Safe Deletion Checklist:

- [ ] Remove from file1.ts imports
- [ ] Update file2.tsx to use alternative
- [ ] Add migration for database changes
- [ ] Update tests
- [ ] Deploy in this order: [list order]
```

If critical dependencies exist, state: **CANNOT DELETE SAFELY** and recommend migration plan (create replacement, migrate callers, deprecate, then delete).
