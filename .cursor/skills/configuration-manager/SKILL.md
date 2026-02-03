---
name: configuration-manager
description: Centralizes and validates app configuration from env. Use when changing environment or user says "add config for [service]".
---

# Configuration Manager

## When to Trigger

- Environment changes
- "Add config for [service]"

## What to Do

1. **Central config**: Single module (e.g. lib/config.ts or config/index.ts) exporting typed object from process.env (app, database, stripe, email, etc.).
2. **Types**: Use `as const` or explicit types so config is type-safe.
3. **Validation**: On startup, validate required env vars with Zod (or similar); log clear errors and exit if invalid.
4. **Secrets**: Never commit secrets; use .env.example with placeholder keys only.

Document new vars in .env.example and any deployment docs.
