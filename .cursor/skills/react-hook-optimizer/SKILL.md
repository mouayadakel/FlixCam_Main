---
name: react-hook-optimizer
description: Fixes hook anti-patterns: missing deps, infinite loops, unnecessary re-renders. Use when creating hooks, using useEffect, or when performance issues are suspected.
---

# React Hook Optimizer

## When to Trigger

- Creating custom hooks
- Using useEffect
- Performance issues detected

## What to Do

1. **useEffect deps**: Include all referenced values in the dependency array; use exhaustive-deps rule.
2. **Infinite loops**: Avoid setting state from effect with that state in deps; use functional updates (e.g. setData(prev => [...prev, item])) or move state out of deps.
3. **Re-renders**: useMemo for expensive derived values; useCallback for stable callbacks passed to children; React.memo for pure list items when parent re-renders often.
4. **Static values**: Move constants and static objects outside component to avoid new reference each render.

Suggest concrete code changes. Preserve behavior while fixing correctness and performance.
