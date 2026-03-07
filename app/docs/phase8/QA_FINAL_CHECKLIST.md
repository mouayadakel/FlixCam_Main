# Phase 8.7 – QA Final Checklist

## Flows to Manually Verify

### Public

- [ ] Homepage loads; hero, featured, how it works, FAQ, CTA present.
- [ ] Equipment catalog: filters, pagination, card click to detail.
- [ ] Equipment detail: gallery, price, add to cart.
- [ ] Cart: add/update/remove items; coupon; summary.
- [ ] Checkout: Step 1 (contact/OTP), Step 2 (details), Step 3 (review); price lock; payment redirect.
- [ ] Confirmation: summary, calendar download, WhatsApp link.

### Portal (logged-in customer)

- [ ] Dashboard and bookings list load.
- [ ] Booking detail: info, equipment, payments, contracts link.
- [ ] Request change: dialog, submit; success message.
- [ ] Request extension: new end date, reason; submit; success.
- [ ] Cancel: allowed when policy ok; disabled with tooltip when not; confirm cancel.
- [ ] Report damage: type, severity, description, cost; submit; success.
- [ ] Profile: load, edit name/phone, save.
- [ ] Documents: contracts and invoices listed; links work.

### Admin

- [ ] Settings: Website pages list, Checkout settings, OTP & Payment, Feature flags, Roles.
- [ ] Website pages: list loads (empty or seeded).
- [ ] Bookings: mark returned (ACTIVE → RETURNED) when permitted.

## Browsers & Devices

- [ ] Chrome, Safari, Firefox (latest).
- [ ] Mobile viewport (e.g. 375px); RTL layout correct.
- [ ] Arabic and English (if applicable).

## Edge Cases

- [ ] Cancel CONFIRMED < 48h before start: button disabled or error.
- [ ] Request change/extension for non-CONFIRMED/ACTIVE: API returns 400.
- [ ] Report damage with invalid equipmentId for booking: API returns 400.
- [ ] Unauthenticated access to portal: redirect to login.
