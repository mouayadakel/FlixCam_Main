# Mobile Web Testing Checklist (FlixCam.rent)

Use this checklist to verify the mobile overhaul (plan: Mobile Responsive Overhaul).

## Device matrix (Chrome DevTools)

Test at these viewports:

| Device       | Width × Height |
| ------------ | -------------- |
| iPhone SE    | 375 × 667      |
| iPhone 14    | 390 × 844      |
| iPhone 11/XR | 414 × 896      |
| iPad         | 768 × 1024     |
| Pixel 4      | 360 × 800      |
| Pixel 6      | 412 × 915      |

## Per-page checklist

For every page in Phase 2 (public) and Phase 3 (admin):

- [ ] No horizontal overflow at 375px width
- [ ] All body text ≥ 16px (or `text-base`)
- [ ] All tap targets ≥ 44×44px
- [ ] No content clipped or hidden behind fixed bars
- [ ] Loading state: skeleton or spinner
- [ ] Empty state: clear CTA or message
- [ ] Error state: retry or message
- [ ] RTL: layout and text direction correct
- [ ] Desktop (1280px): layout unchanged from pre-overhaul

## Critical flows

- [ ] **Booking flow:** Browse equipment → Add to cart → Checkout (all steps) → Confirmation
- [ ] **Admin warehouse:** Warehouse home → Check-out or Check-in → Select booking → Confirm

## Lighthouse targets (mobile)

Run Lighthouse in Chrome (mobile mode) on key pages:

| Metric         | Target |
| -------------- | ------ |
| Performance    | ≥ 80   |
| Accessibility  | ≥ 90   |
| Best Practices | ≥ 90   |
| SEO            | ≥ 90   |

## Definition of done

- [ ] Every page passes the per-page checklist on all 6 device sizes
- [ ] Booking flow completes without friction on mobile
- [ ] Admin warehouse check-in/check-out usable entirely on mobile
- [ ] `npm run build` exits with zero TypeScript errors
- [ ] Desktop at 1280px is pixel-identical to pre-overhaul
