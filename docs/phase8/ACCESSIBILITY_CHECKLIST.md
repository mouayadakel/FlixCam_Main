# Phase 8.6 – Accessibility (WCAG AA) Checklist

## Portal & Public Pages

- [ ] **Semantic HTML** – Headings (h1–h6), nav, main, section; buttons/links used correctly.
- [ ] **Focus** – All interactive elements focusable; focus order logical (especially in RTL).
- [ ] **Labels** – Form inputs have associated `<label>` or `aria-label`.
- [ ] **Errors** – Error messages linked via `aria-describedby` or `role="alert"`.
- [ ] **Dialogs** – Focus trapped in modal; focus returns to trigger on close; `aria-modal="true"`.
- [ ] **Color** – Contrast ≥ 4.5:1 for normal text; not only color for meaning.
- [ ] **RTL** – `dir="rtl"` on root/layout; focus and reading order correct for Arabic.

## Components to Check

- Portal: Profile form, Booking actions (request change/extension/cancel/damage dialogs).
- Public: Header, footer, language switcher, mini cart, checkout steps, cookie consent.

## Testing

- Run axe-core (browser extension or jest-axe) on portal and public key pages.
- Keyboard-only navigation: tab through all actions and submit forms.
- Screen reader: announce labels, errors, and dialog open/close.
