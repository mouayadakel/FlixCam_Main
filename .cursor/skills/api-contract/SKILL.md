---
name: api-contract
description: Validates API contracts before and after changes. Documents current contract (params, response, status codes), diffs proposed changes, flags breaking changes and affected clients. Use when changing API route files, Zod schemas, or response types, or when user mentions API/endpoint/route.
---

# API Contract Validator

## When to Trigger

- Changes to API route files (src/app/api/**/route.ts)
- Changes to Zod schemas
- Changes to response types
- User mentions "API", "endpoint", "route"

## What to Do

### Step 1: Extract Current Contract

Document:

- Endpoint and method
- Auth requirement
- Request params (types, optional/required)
- Response shape (data, meta, etc.)
- Status codes (200, 401, 500, etc.)

### Step 2: Compare with Proposed Changes

Show diff of params and response. Mark: unchanged ✅, new ⚠️, removed ❌.

### Step 3: Report

Output:

```markdown
## API Contract Changes

### Endpoint: [METHOD] [path]

#### Request Parameters
[BEFORE/AFTER or unchanged/new/removed]

#### Response Body
BEFORE: [shape]
AFTER: [shape]
Breaking: Yes/No | Backwards compatible: Yes/No

#### Affected Clients:
- [Client name]: Compatible / Update needed

#### Migration for Clients:
[Code examples for old vs new usage]
```

If breaking (e.g. changing `{ data: [] }` to raw array), recommend: new v2 endpoint, or optional query param (e.g. `?format=array`) while keeping default. Do not proceed with breaking change without explicit migration strategy.
