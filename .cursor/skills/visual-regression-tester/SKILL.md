---
name: visual-regression-tester
description: Adds visual regression tests (screenshot comparison) for UI and viewports. Use when changing UI/CSS or user asks to check visual changes.
---

# Visual Regression Tester

## When to Trigger

- UI component changes
- CSS updates
- "Check visual changes"

## What to Do

1. **Tool**: Use Playwright toHaveScreenshot or similar; set threshold/maxDiffPixels for minor differences.
2. **Scenes**: Key states (default, loading, error, empty) and critical viewports (desktop, mobile).
3. **Baseline**: Generate baseline on first run; commit; failures show diff.
4. **Stability**: Use stable data (mocks) and hide timestamps/dynamic content if they cause noise.

Store screenshots in tests/visual/ or similar. Run in CI and treat failures as review prompts, not auto-fail, if flaky.
