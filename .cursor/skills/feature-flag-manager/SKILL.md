---
name: feature-flag-manager
description: Adds feature flags (storage, hook, admin toggle). Use when user says "add feature flag for [feature]" or introducing experimental features.
---

# Feature Flag Manager

## When to Trigger

- "Add feature flag for [feature]"
- New experimental feature

## What to Do

1. **Storage**: Add flag to DB or config (e.g. feature_flags table or env/config object).
2. **Hook**: e.g. useFeature(flag) that returns boolean (from API or config); use React Query if fetched.
3. **Usage**: In components, branch on flag (e.g. show LegacyFeature vs EnhancedFeature).
4. **Admin**: If project has admin UI, add toggle for the flag.

Keep flag names UPPER_SNAKE_CASE and document in config/types. Use existing feature-flag service if project has one.
