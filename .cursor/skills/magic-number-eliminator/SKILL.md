---
name: magic-number-eliminator
description: Replaces hardcoded numbers with named constants. Use when magic numbers or repeated numeric values appear in code.
---

# Magic Number Eliminator

## When to Trigger

- Hardcoded numbers detected
- Repeated values

## What to Do

1. **Identify**: Numbers used for limits, timeouts, fees, percentages, sizes (e.g. 50, 3000, 0.029, 0.30).
2. **Extract**: Define named constants (e.g. PAGINATION_THRESHOLD, RETRY_DELAY_MS, STRIPE_FEE_PERCENTAGE).
3. **Place**: In same file for local use, or in lib/constants or feature constants file for shared use.
4. **Group**: Use objects for related constants (e.g. PAGINATION.DEFAULT_PAGE_SIZE, FEES.STRIPE_PERCENTAGE).

Use const and optional as const for literal types. Document units (ms, percent, cents) in name or comment.
