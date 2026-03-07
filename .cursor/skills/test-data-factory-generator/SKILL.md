---
name: test-data-factory-generator
description: Generates test data factories (build, buildMany, variants) for models using faker or similar. Use when writing tests or user says "need test data".
---

# Test Data Factory Generator

## When to Trigger

- Writing tests
- "Need test data"

## What to Do

1. **Per model**: Create factory with build(overrides?), buildMany(n, overrides?), and named variants (e.g. buildActive(), buildOverdue()).
2. **Use Prisma/shared types**: Return type matches model; override only fields needed for test.
3. **Faker**: Use for ids, dates, strings, numbers; keep values deterministic in tests when it matters (e.g. fixed seed).
4. **Place**: tests/factories/[model].factory.ts; export and use in describe blocks.

Keep factories next to tests or in shared test helpers. Document variants (e.g. "buildOverdue: endDate in past").
