---
name: async-await-error-handler
description: Ensures async operations have proper error handling (try/catch, status checks, typed errors). Use when writing async functions, promise chains, or API calls.
---

# Async/Await Error Handler

## When to Trigger

- Using async functions
- Promise chains
- API calls

## What to Do

1. **Fetch/API**: Check response.ok; throw on non-2xx; parse JSON in try; catch and log, then rethrow or return typed error.
2. **Async functions**: Wrap in try/catch; use custom error classes where helpful; log server-side, return user-safe message in production.
3. **API routes**: Catch Zod validation (400), auth (401/403), not found (404), and generic (500); never expose stack or internals in response.
4. **Abort**: For fetch in React, use AbortController and abort on unmount to avoid setState after unmount.

Never leave async calls without handling rejection. Prefer typed errors (e.g. from lib/errors) for known cases.
