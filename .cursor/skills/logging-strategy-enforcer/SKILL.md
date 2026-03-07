---
name: logging-strategy-enforcer
description: Replaces console.log with structured logging and request-scoped loggers. Use when adding console.log, error handling, or critical operations.
---

# Logging Strategy Enforcer

## When to Trigger

- Adding console.log
- Error handling
- Critical operations

## What to Do

1. **Structured logger**: Use a logger (e.g. pino) with level and optional pretty transport in dev. Replace console.log with logger.info, console.error with logger.error, with context object (e.g. userId, bookingId).
2. **Request context**: For API routes, create child logger with requestId (from header or generated) so logs can be traced.
3. **Never log**: Passwords, tokens, full PII; redact or omit.

Pattern: logger.info({ key: value }, 'Message'). Use existing lib/logger if present.
