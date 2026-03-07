---
name: mutation-testing-generator
description: Configures mutation testing (e.g. Stryker) to measure test quality. Use when test suite is in place and user wants to check test quality.
---

# Mutation Testing Generator

## When to Trigger

- Test suite completion
- "Check test quality"

## What to Do

1. **Config**: Add Stryker (or similar) config: mutator (TypeScript), test runner (Jest/Vitest), files to mutate (exclude \*.test.ts).
2. **Thresholds**: Set high/low/break for mutation score; document what they mean.
3. **Run**: Generate report; explain that surviving mutations mean tests didn’t catch that change (weak test or redundant code).
4. **Focus**: Suggest improving tests for frequently surviving mutations first.

Mutation testing is slow; run on subset or in nightly. Use for critical paths rather than entire codebase at first.
