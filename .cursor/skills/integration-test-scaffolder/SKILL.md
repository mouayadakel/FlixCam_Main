---
name: integration-test-scaffolder
description: Scaffolds integration tests for API routes and DB operations (setup/teardown, auth, status and body asserts). Use when creating API routes or database-backed flows.
---

# Integration Test Scaffolder

## When to Trigger

- API route created
- Database operations
- External service integration

## What to Do

1. **Setup**: beforeAll/afterAll for DB (e.g. test DB or transaction rollback); beforeEach to reset data if needed.
2. **Client**: Use test client (e.g. supertest or project helper) to hit app routes; support auth (e.g. as('admin')).
3. **Cases**: Happy path (201/200, body shape); validation (400); auth (401/403); not found (404); conflict/duplicate where relevant.
4. **Assert**: Status, response shape, and optionally DB state (e.g. prisma.booking.findUnique).

Place in tests/integration/ or similar. Use factories for test data. Keep tests independent and order-independent.
