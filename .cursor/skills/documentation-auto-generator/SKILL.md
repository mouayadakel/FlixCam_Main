---
name: documentation-auto-generator
description: Generates READMEs, JSDoc, and API docs for features and functions. Use when adding new features, changing APIs, or user says "generate docs".
---

# Documentation Auto-Generator

## When to Trigger

- New feature created
- API changes
- "Generate docs"

## What to Do

1. **README per feature**: Overview, usage (code example), related docs (links to other features/APIs).
2. **JSDoc**: For public functions: description, @param, @returns, @throws, @example. For complex logic explain "why" briefly.
3. **API docs**: If project uses OpenAPI/Swagger, update or add endpoint description, params, response, status codes.
4. **Storybook**: For UI components, add story if project uses Storybook.

Keep docs in sync with code; avoid TODOs in docs—implement or remove. Follow project docs structure (e.g. docs/, docs/features/).
