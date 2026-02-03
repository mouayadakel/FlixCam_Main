---
name: component-composition-analyzer
description: Suggests splitting large components (>10 props, >200 lines) into smaller, single-responsibility components. Use when creating complex components or refactoring.
---

# Component Composition Analyzer

## When to Trigger

- Creating complex components
- Component has >10 props
- Component >200 lines

## What to Do

1. **Identify**: Sections that can be separate components (form sections, lists, modals, toolbars).
2. **Split**: Extract into named components with clear props; keep parent as orchestrator with minimal state.
3. **Props**: Prefer few, focused props; use composition (children, render props) instead of many optional flags.
4. **Benefits**: Smaller files, single responsibility, easier testing, better memoization.

Suggest concrete component names and prop interfaces. Keep each new component under ~50–100 lines where possible.
