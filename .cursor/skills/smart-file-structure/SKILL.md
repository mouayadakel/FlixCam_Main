---
name: smart-file-structure
description: Organizes new features and modules into a consistent src layout (app, components, lib, config, tests). Use when creating new features, user says "create new module" or "add feature", or on project initialization.
---

# Smart File Structure Organizer

## When to Trigger

- Creating new features
- User says "create new module", "add feature"
- Project initialization

## What to Do

Propose or create structure following project conventions, e.g.:

```
src/
├── app/
│   ├── (auth)/ login, register
│   ├── (dashboard)/ [feature]
│   └── api/ [resource]/ [id]/
├── components/
│   ├── ui/
│   ├── features/
│   └── layouts/
├── lib/
│   ├── services/
│   ├── utils/
│   ├── hooks/
│   └── types/
├── config/
└── tests/ unit, integration, e2e
```

Auto-create where appropriate: README per feature, index.ts for exports, types.ts, constants.ts. Align with existing .cursorrules and docs (e.g. docs/ structure).
