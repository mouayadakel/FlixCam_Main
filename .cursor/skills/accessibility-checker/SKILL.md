---
name: accessibility-checker
description: Adds and checks a11y: labels, aria attributes, focus, semantics, contrast. Use when creating UI components, forms, or interactive elements.
---

# Accessibility Checker

## When to Trigger

- Creating UI components
- Form creation
- Interactive elements

## What to Do

1. **Buttons**: aria-label or visible text; aria-describedby for extra description; icons with aria-hidden if decorative.
2. **Forms**: Every input has associated label (htmlFor/id); aria-required, aria-invalid, aria-describedby for errors; error message with role="alert".
3. **Images**: Meaningful alt text; decorative images alt="" or aria-hidden.
4. **Focus**: Visible focus styles; focus not trapped unless modal; logical tab order.
5. **Semantics**: Use heading hierarchy (no skipped levels), nav, main, section; buttons for actions, links for navigation.

Check: missing alt, unlabeled controls, poor contrast, non-semantic HTML. Suggest concrete attribute and markup changes.
