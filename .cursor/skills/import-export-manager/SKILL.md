---
name: import-export-manager
description: Organizes and fixes imports (grouping, sorting, removing unused) and creates barrel exports. Use when creating new modules or refactoring imports.
---

# Import/Export Manager

## When to Trigger

- Creating new modules
- Refactoring imports

## What to Do

1. **Group imports**: External packages → internal (@/…) → relative (./).
2. **Sort**: Alphabetically within groups.
3. **Remove**: Unused imports.
4. **Barrel exports**: For folders with 3+ public files, add index.ts that re-exports (no default unless project convention).

Use path alias @/ for internal modules. Match existing style (single vs double quotes, semicolons) from project config.
