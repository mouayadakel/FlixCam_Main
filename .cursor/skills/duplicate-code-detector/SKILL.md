---
name: duplicate-code-detector
description: Detects similar or copy-pasted code and suggests DRY refactors (shared functions, params, generics). Use when code similarity or repetition is noticed.
---

# Duplicate Code Detector

## When to Trigger

- Code similarity >70%
- Copy-paste detected
- Similar patterns in multiple places

## What to Do

1. **Find**: Functions or blocks that differ only by a few values (e.g. status, filter).
2. **Refactor**: Single function with parameters (e.g. getBookingsByStatus(status)) or generic helper with options object.
3. **Reuse**: Extract to shared util, hook, or service; call from original call sites.
4. **Types**: Use shared types/interfaces so refactor stays type-safe.

Prefer small, focused helpers over large generic functions. Preserve behavior and add/run tests if touching critical paths.
