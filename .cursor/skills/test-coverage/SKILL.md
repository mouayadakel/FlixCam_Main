---
name: test-coverage
description: Enforces test coverage for new or changed logic. Identifies scenarios (happy path, errors, edge cases), generates test templates, tracks coverage. Use when creating API routes, adding business logic, modifying critical functions, or keywords function/service/util/helper.
---

# Test Coverage Enforcer

## When to Trigger

- Creating new API routes
- Adding new business logic
- Modifying critical functions
- Keywords: "function", "service", "util", "helper"

## What to Do

### Step 1: Identify What Needs Tests

List:

- New/changed file and functions
- Test scenarios: valid inputs, multiple items, rules applied, invalid dates, not found, negative/edge cases, auth, audit

### Step 2: Generate Test Template

Produce describe/it blocks with:

- Arrange (mocks, fixtures)
- Act (call function or request)
- Assert (expect)

Use project test runner (e.g. Jest/Vitest) and any existing patterns (e.g. prisma-mock, test client).

### Step 3: Track Coverage

Note current vs target (e.g. lines 80%, branches). List missing coverage (files and line ranges). Suggest next test cases.

For money/critical logic, state that tests are required before merge. Ask: "Create test file? (yes/no)" or "Generate test boilerplate? (yes/no)".
