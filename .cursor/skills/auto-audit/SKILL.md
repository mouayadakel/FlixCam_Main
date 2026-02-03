---
name: auto-audit
description: Runs impact analysis before making code changes. Analyzes affected files, database impact, API compatibility, security, and rollback. Use before refactoring, optimizing, fixing, or updating existing code, or when implementing features that touch existing code.
---

# Auto-Audit Skill

## When to Trigger

- Before making ANY code changes to existing files
- When user says "refactor", "optimize", "fix", or "update"
- Before implementing new features that touch existing code

## What to Do

### Step 1: Analyze Impact

Before changing any file, check:

1. What components import this file?
2. What API routes depend on this?
3. Are there any database queries that will be affected?
4. Does this change affect authentication/authorization?
5. Will this break existing features?

### Step 2: Create Audit Report

Before making changes, output:

```markdown
## Impact Analysis for [filename]

### Files That Will Be Affected:
- [ ] file1.ts (imports this)
- [ ] file2.tsx (uses this function)

### Database Changes Required:
- [ ] None
- [ ] Migration needed: [describe]

### API Changes:
- [ ] Breaking change: Yes/No
- [ ] Backwards compatible: Yes/No

### Security Implications:
- [ ] Authentication affected: Yes/No
- [ ] Authorization affected: Yes/No
- [ ] New permissions needed: Yes/No

### Testing Required:
- [ ] Unit tests to update
- [ ] Integration tests needed
- [ ] Manual testing steps

### Rollback Plan:
[Describe how to undo if this breaks]
```

### Step 3: Get Confirmation

Ask user: "I've identified [X] potential impacts. Proceed with changes? (yes/no)"

## Example Usage

**User:** "Update the booking status enum"

**Agent:**

🔍 Auto-Audit Activated

Analyzing impact of changing BookingStatus enum...

## Impact Analysis

### Files Affected (12):
- src/app/api/bookings/route.ts (status checks)
- src/components/booking-card.tsx (status display)
- src/lib/services/booking.service.ts (business logic)
... [9 more]

### Database Migration:
⚠️ WARNING: This is a breaking change
- Need migration to update existing booking records
- Estimated 500+ records will be affected

### Breaking Changes:
❌ API responses will change
❌ Frontend components expect old values

### Recommendation:
1. Create migration script first
2. Add backwards compatibility layer
3. Deprecate old values gradually

Proceed? (yes/no)
