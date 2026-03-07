---
name: typescript-strictness-enforcer
description: Enforces TypeScript strictness: no any, proper null handling, strict options. Use when creating new files, modifying types, or using 'any'.
---

# TypeScript Strictness Enforcer

## When to Trigger

- Creating new files
- Modifying types
- Using 'any'

## What to Do

1. **Remove any**: Replace with proper types or unknown and narrow.
2. **Null/undefined**: Use optional chaining, nullish coalescing, or explicit return type (e.g. string | null).
3. **tsconfig**: Recommend strict, noUncheckedIndexedAccess, noImplicitAny, strictNullChecks, noUnusedLocals, noUnusedParameters where appropriate.
4. **Interfaces**: Define for function params and return types; use Prisma types or shared types from lib/types.

Suggest fixes with code; don’t weaken types to satisfy checks. Prefer type-safe patterns (discriminated unions, type guards).
