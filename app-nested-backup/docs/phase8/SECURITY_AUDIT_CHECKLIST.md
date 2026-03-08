# Phase 8.5 – Security Audit Checklist

Use this checklist for new portal and admin endpoints.

## Portal APIs (`/api/portal/*`)

- [ ] **Authentication** – All portal routes require `session?.user?.id`; return 401 when missing.
- [ ] **Authorization** – Customer can only act on own resources (e.g. `customerId: session.user.id` in booking queries).
- [ ] **Input validation** – All body/params validated with Zod; no raw `request.json()` without schema.
- [ ] **Rate limiting** – Consider applying rate limit to request-change, request-extension, cancel, report-damage (e.g. per user).
- [ ] **No PII in logs** – Avoid logging full request body or tokens.

## Admin APIs (`/api/admin/*`)

- [ ] **Authentication** – Admin routes require valid session.
- [ ] **Authorization** – Use `hasPermission()` (e.g. SETTINGS_READ, SETTINGS_UPDATE, BOOKING_UPDATE) before any mutation.
- [ ] **Input validation** – Zod or equivalent for all inputs.

## Booking & Payments

- [ ] **Cancel policy** – Enforced server-side (48h before start for CONFIRMED).
- [ ] **Mark returned** – Only BOOKING_UPDATE can call; state transition ACTIVE → RETURNED only.
- [ ] **Damage report** – Customer can only report for own booking; equipment must belong to booking.

## General

- [ ] **HTTPS** – Enforce in production (headers already in next.config).
- [ ] **Secrets** – No API keys or secrets in client bundle or logs.
- [ ] **CORS** – Restrict to known origins if applicable.
