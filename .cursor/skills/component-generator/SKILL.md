---
name: component-generator
description: Generates complete React component structure (component, types, hook, test, index). Use when user says "create component [name]" or "new React component".
---

# Component Generator

## When to Trigger

- "Create component [name]"
- "New React component"

## What to Do

Generate in a feature folder (e.g. components/features/[name]/):

- **Component file** ([name].tsx): 'use client' if needed, imports from @/components/ui and local types/hook, named export.
- **types.ts**: Props interface (e.g. XProps).
- **use-[name].ts** (optional): Hook for state and handlers.
- **index.ts**: Barrel export component and types.
- **Test file** (optional): [name].test.tsx with describe/it.

Use kebab-case filenames, PascalCase component names. Follow project UI library and patterns (e.g. shadcn).
