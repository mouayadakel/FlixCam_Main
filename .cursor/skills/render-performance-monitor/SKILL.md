---
name: render-performance-monitor
description: Detects unnecessary re-renders and slow render (>16ms). Suggests memo, useCallback, useMemo, and splitting. Use when re-renders or frame drops are suspected.
---

# Render Performance Monitor

## When to Trigger

- Component re-renders detected
- Slow rendering (>16ms)
- Frame drops

## What to Do

1. **Stable refs**: useCallback for handlers passed to children; useMemo for derived data and expensive calculations.
2. **Memo**: React.memo on list item or pure components when parent re-renders often and props are stable.
3. **Expensive work**: Move out of render into useMemo (deps = inputs); avoid new object/array in render that are used as deps elsewhere.
4. **Profiler**: Use React DevTools Profiler or onRender callback to log components exceeding 16ms.

Target 60fps (16ms per frame). Fix one component at a time and re-measure. Prefer correct deps over aggressive memoization.
