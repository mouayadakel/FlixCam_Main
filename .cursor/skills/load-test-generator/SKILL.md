---
name: load-test-generator
description: Generates load tests (e.g. k6) for API endpoints with stages and thresholds. Use when adding APIs, testing performance, or before production deploy.
---

# Load Test Generator

## When to Trigger

- API endpoints created
- "Test performance"
- Before production deploy

## What to Do

1. **Script**: Use k6 or similar; define stages (ramp up, hold, ramp down) and target VUs.
2. **Requests**: Hit main endpoints (GET list, POST create) with auth header; check status and optionally response shape.
3. **Thresholds**: e.g. p95 latency <500ms, error rate <1%; fail run if exceeded.
4. **Env**: Base URL and token from env; document how to run locally and in CI.

Place in tests/load/; add npm script. Remind to run against staging, not production, and to respect rate limits.
