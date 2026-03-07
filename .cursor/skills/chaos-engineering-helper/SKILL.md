---
name: chaos-engineering-helper
description: Helps add chaos/resilience tests (DB timeout, disconnect, API failure, retry). Use when testing failure scenarios or production readiness.
---

# Chaos Engineering Helper

## When to Trigger

- Testing resilience
- "Test failure scenarios"
- Production readiness

## What to Do

1. **Scenarios**: Simulate DB timeout, disconnect, or slow query; external API timeout or rate limit.
2. **Helpers**: Test helpers that mock or inject failure (e.g. jest.spyOn on prisma or fetch) for a duration or until restored.
3. **Assert**: Service rejects with expected error; retries occur (check timing/count); no crash; user sees safe message.
4. **Recovery**: After restore, next request succeeds.

Use in dedicated chaos or resilience describe blocks; restore mocks in afterEach. Document required env (e.g. test DB).
