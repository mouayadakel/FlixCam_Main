---
name: e2e-test-generator
description: Generates E2E tests for critical user flows (Playwright or similar). Use for checkout, booking, or multi-step processes when user asks to test a flow.
---

# E2E Test Generator

## When to Trigger

- Critical user flows
- "Test checkout flow"
- Multi-step processes

## What to Do

1. **Flow**: Login (or use fixture), navigate, fill forms, submit, assert URL and success message.
2. **Selectors**: Prefer data-testid or role/label; avoid brittle class/text when possible.
3. **Assertions**: Visible text, URL, disabled state; wait for navigation or network if needed.
4. **Variants**: Validation errors (submit empty), error states (e.g. unavailable item).

Use project E2E runner (e.g. Playwright). Keep one flow per describe; use beforeEach for login. Document required test user/env.
