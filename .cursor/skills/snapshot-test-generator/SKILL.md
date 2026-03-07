---
name: snapshot-test-generator
description: Generates snapshot tests for UI components and data transformations. Use when creating UI components or pure transform functions.
---

# Snapshot Test Generator

## When to Trigger

- UI component created
- Data transformation functions

## What to Do

1. **UI**: Render component with representative props (e.g. default, loading, error); toMatchSnapshot() on container or specific wrapper.
2. **Data**: Call transform with fixed input; assert output with toMatchSnapshot() or explicit expect.
3. **Variants**: One test per meaningful state (e.g. active, pending, overdue) so snapshots stay focused.
4. **Update**: Remind that snapshot updates require review; avoid large or noisy snapshots.

Use project test render (e.g. RTL); use factories for props. Prefer small, stable snapshots over one huge file.
