---
name: accessibility-test-generator
description: Generates a11y tests (axe-core, keyboard nav, focus trap, ARIA). Use for UI components or when user asks to test accessibility.
---

# Accessibility Test Generator

## When to Trigger

- UI component creation
- "Test accessibility"
- Before production deploy

## What to Do

1. **axe**: Inject axe and run checkA11y on page or container; fail on violations; use detailed report in dev.
2. **Keyboard**: Tab through interactive elements; assert focus order and Enter/Space on buttons.
3. **ARIA**: Errors with role="alert" and aria-live; modals with role="dialog" and focus trap (Tab wraps inside).
4. **Headings**: Check hierarchy (no skipped levels); list headings in order.

Use axe-playwright or jest-axe; run in E2E or component tests. Fix critical/serious first; document any intentional exceptions.
