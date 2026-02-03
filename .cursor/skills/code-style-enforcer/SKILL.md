---
name: code-style-enforcer
description: Enforces code style (ESLint, Prettier, imports, unused code, TypeScript strict). Use before commit, on save, or during code review.
---

# Code Style Enforcer

## When to Trigger

- Before every commit
- On file save
- Code review

## What to Do

1. **ESLint**: Fix auto-fixable rules; report remaining errors (no-unused-vars, prefer-const, etc.).
2. **Prettier**: Apply formatting (quotes, semicolons, line width).
3. **Imports**: Group and sort; remove unused.
4. **Unused code**: Remove dead code and unused variables.
5. **TypeScript**: Fix strict mode issues; avoid any; add types where missing.

Use project config (.eslintrc, .prettierrc, tsconfig). Do not change behavior—style and lint only. Run build/tests after bulk fixes.
