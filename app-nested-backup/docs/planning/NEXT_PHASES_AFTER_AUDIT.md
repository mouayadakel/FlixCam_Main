# Next Phases — After Admin Control Panel Structural Audit

**Date:** February 25, 2026  
**Context:** All 8 audit fixes (sidebar, finance, messaging, settings, studios, delivery, CMS hub) are implemented.

---

## Immediate (Quick Wins)

| Item | Priority | Description |
|------|----------|-------------|
| **Message Logs page** | Low | Implement `/admin/cms/messaging-center/logs` and re-add to Messaging Center (TODO in sidebar) |
| **Finance permission** | Low | Consider `invoice.read \|\| payment.read` for Finance item visibility |

---

## Phase A: Admin Panel Production Readiness

**Source:** `docs/planning/ADMIN_PANEL_PRODUCTION_READY_GAP_ANALYSIS.md`

### 1. Missing Pages (Must Build)

- Invoice create/detail: `/admin/invoices/new`, `/admin/invoices/[id]`
- Payment detail: `/admin/payments/[id]`
- Contract detail: `/admin/contracts/[id]`
- Client create/detail: `/admin/clients/new`, `/admin/clients/[id]`
- Coupon create/detail: `/admin/coupons/new`, `/admin/coupons/[id]`
- Maintenance create/detail: `/admin/maintenance/new`, `/admin/maintenance/[id]`
- Marketing campaigns: `/admin/marketing/campaigns/new`, `/admin/marketing/campaigns/[id]`
- Warehouse: check-out, check-in, inventory pages
- Notifications: `/admin/notifications`
- Profile: `/admin/profile`

### 2. Mock → Live Conversions

- Calendar (real availability data)
- Inventory categories (real API)
- Technicians (real API)
- Wallet (real data)

### 3. Standards & Architecture

- Service layer extraction (role.service, role.policy, role.validator)
- Audit logging on sensitive actions
- Pagination on all list pages
- Export CSV/Excel where applicable

---

## Phase B: Roles & Permissions Completion

**Source:** `docs/planning/NEXT_PHASE_AND_STEP.md`

- Role detail page: real API data, no hardcoded placeholders
- List page: correct ROLE_LABELS for all 12 roles, permissions in list
- New Role: disable with tooltip until custom roles exist (or implement custom roles)
- Optional: Extract to `role.service.ts`, `role.policy.ts`, `role.validator.ts`

---

## Phase C: Public Website & Checkout

**Source:** `docs/public-website/COMPLETE_PRODUCTION_READY_PLAN.md`, `docs/CHECKOUT_PROCESS_USER_AND_CASE_STORIES.md`

- Security: CSP, CORS, rate limiting, session management
- Checkout flow: Dates → Availability (lock price) → Add-ons → Review → Payment → Confirm
- Payment: TAP integration, webhooks, 3D Secure
- Portal: Dashboard, bookings, profile, documents

---

## Phase D: AI & Growth (PRD Phase 2)

**Source:** `docs/PRD.md`, `docs/audits/AI_FEATURES_FULL_AUDIT_REPORT.md`

- AI risk scoring
- Equipment recommendations
- Smart bundles / packages
- Demand prediction
- Kit Builder merge with AI tab

---

## Phase E: Hardening & Scale

**Source:** `docs/ROADMAP.md`

- Security audit
- Performance testing
- Load testing
- Observability (logs, tracing, metrics)
- Redis caching
- Background jobs for exports/reports

---

## Recommended Order

1. **Phase A (Admin gaps)** — Fill missing pages and convert mock to live (2–4 weeks)
2. **Phase B (Roles)** — Complete roles/permissions if not already done (1 week)
3. **Phase C (Public/Checkout)** — Production-ready checkout and portal (4–8 weeks)
4. **Phase D (AI)** — AI features per PRD (2–4 weeks)
5. **Phase E (Hardening)** — Security, performance, scale (ongoing)

---

## Reference Docs

- `docs/planning/NEXT_PHASE_AND_STEP.md`
- `docs/planning/ADMIN_PANEL_PRODUCTION_READY_GAP_ANALYSIS.md`
- `docs/public-website/COMPLETE_PRODUCTION_READY_PLAN.md`
- `docs/ROADMAP.md`
- `docs/PRD.md`
