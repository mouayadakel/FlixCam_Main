# API Documentation – Portal & Admin (Phase 9.1)

## Portal APIs (customer, authenticated)

Base: same origin. All require `session.user.id` (401 if missing).

### POST /api/portal/bookings/[id]/request-change

Submit a change request for a booking.

- **Auth:** Required (customer).
- **Body:** `{ reason: string (1–500), requestedChanges?: { startDate?, endDate?, equipmentIds?, notes? } }`
- **Response:** `{ id, status, message }` or `{ error }` (400/404/500).
- **Rules:** Booking must be CONFIRMED or ACTIVE; booking must belong to current user.

### POST /api/portal/bookings/[id]/request-extension

Submit an extension request (new end date).

- **Auth:** Required (customer).
- **Body:** `{ reason: string (1–500), requestedEndDate: ISO date }` — requestedEndDate must be after current end and in future.
- **Response:** `{ id, status, message }` or `{ error }`.
- **Rules:** Booking CONFIRMED or ACTIVE; customer owns booking.

### POST /api/portal/bookings/[id]/cancel

Cancel own booking (policy: 48h before start for CONFIRMED).

- **Auth:** Required (customer).
- **Body:** `{ reason?: string (max 500) }`
- **Response:** `{ message }` or `{ error }` (400 if not allowed).
- **Rules:** DRAFT/RISK_CHECK/PAYMENT_PENDING always allowed; CONFIRMED only if start ≥ 48h away; ACTIVE/RETURNED/CLOSED not allowed.

### POST /api/portal/bookings/[id]/report-damage

Report damage for a booking.

- **Auth:** Required (customer).
- **Body:** `{ equipmentId?: string, damageType, severity, description (1–5000), photos?: string[], estimatedCost: number ≥ 0, insuranceClaim?: boolean }`
- **Response:** `{ id, status, message }` or `{ error }`.
- **Rules:** Booking ACTIVE or RETURNED; customer owns booking; equipmentId must belong to booking if set.

---

## Admin / Internal APIs

### GET /api/admin/website-pages

List website pages (CMS).

- **Auth:** Required; SETTINGS_READ or SETTINGS_UPDATE.
- **Response:** `{ pages: Array<{ id, slug, titleAr, titleEn, titleZh, isPublished, seo, sectionsCount, createdAt, updatedAt }> }`.

### POST /api/bookings/[id]/mark-returned

Mark booking as returned (ACTIVE → RETURNED). Computes late fee if actualReturnDate > endDate.

- **Auth:** Required; BOOKING_UPDATE.
- **Body:** `{ actualReturnDate?: ISO date }` (default: now).
- **Response:** `{ id, status, actualReturnDate, lateFeeAmount? }` or error.
