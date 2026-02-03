---
name: dependency-updater
description: Reports dependency updates by risk (safe patch, minor to test, major breaking) and security. Use on schedule, when user says "update dependencies", or when a vulnerability is reported.
---

# Dependency Updater

## When to Trigger

- Weekly/scheduled check
- "Update dependencies"
- Security vulnerability reported

## What to Do

1. **Check**: npm outdated / yarn outdated / similar; check security advisories (npm audit).
2. **Categorize**:
   - **Safe**: Patch updates, no breaking changes; can auto-apply.
   - **Requires testing**: Minor updates; note changelog and migration.
   - **Breaking**: Major updates; list impact and affected files; recommend dedicated upgrade.
   - **Security**: Mark urgent; recommend immediate update and test.
3. **Report**: Table or list with package, current → target, risk, action.
4. **Apply**: Only auto-apply after user confirms; run tests after updates.

Suggest locking transitive deps or using overrides only when necessary and documented.
