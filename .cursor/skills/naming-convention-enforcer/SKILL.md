---
name: naming-convention-enforcer
description: Enforces consistent naming: kebab-case files, PascalCase components, camelCase variables, SCREAMING_SNAKE constants, use* hooks, handle* handlers. Use when creating files/variables or when inconsistency is detected.
---

# Naming Convention Enforcer

## When to Trigger

- Creating new files/variables
- Inconsistent naming detected

## What to Do

- **Files**: kebab-case (e.g. booking-card.tsx).
- **Components**: PascalCase (e.g. BookingCard).
- **Variables/functions**: camelCase (e.g. bookingCount, getBooking).
- **Constants**: SCREAMING_SNAKE_CASE (e.g. API_URL, MAX_PAGE_SIZE).
- **Hooks**: Prefix use (e.g. useBooking, useAuth).
- **Event handlers**: handle* or on* for props (e.g. handleSubmit, onBookingDelete).
- **Booleans**: is*, has*, can*, should* (e.g. isLoading, hasPermission).

Align with project .cursorrules. Suggest renames with concrete replacements.
