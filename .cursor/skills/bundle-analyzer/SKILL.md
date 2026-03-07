---
name: bundle-analyzer
description: Analyzes bundle size and suggests optimizations (replace heavy deps, dynamic import, tree-shake). Use on build, when bundle grows, or when user says "analyze bundle".
---

# Bundle Analyzer

## When to Trigger

- Build process
- Bundle size increases
- "Analyze bundle"

## What to Do

1. **Report**: Run Next.js build with bundle analyzer or webpack-bundle-analyzer; list largest chunks and deps.
2. **Suggest**: Replace heavy libs (e.g. moment → date-fns); use selective imports (lodash/debounce); dynamic import for heavy components (charts, PDF); ensure Prisma/heavy deps only in server code.
3. **Targets**: Set size targets (e.g. main <500KB); flag regressions.
4. **Apply**: Suggest concrete code changes (imports, next/dynamic) and optional npm script for analyze.

Document how to run (e.g. ANALYZE=true npm run build). Don’t remove deps without checking all usages.
