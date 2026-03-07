---
name: security-audit
description: Runs security checklist on auth, routes, and user input. Checks protection, validation, data exposure, rate limiting, encryption. Use for changes to auth, API routes with sensitive data, permission checks, user input handling, file uploads, or keywords auth/login/password/admin/permission.
---

# Security Audit Trigger

## When to Trigger

- ANY changes to authentication code
- Changes to API routes with sensitive data
- Changes to permission checks
- User input handling, database queries with user input, file uploads
- Keywords: "auth", "login", "password", "admin", "user", "permission"

## What to Do

### Step 1: Security Checklist

Run through:

- **Auth & Authorization**: Route protected? Permissions verified? Can users access other users' data? Session/token validated?
- **Input Validation**: All inputs validated (e.g. Zod)? SQL injection prevented (Prisma/parameterized)? XSS prevented? File upload validated (type, size, content)? Path traversal prevented?
- **Data Exposure**: Sensitive data in logs? Error messages reveal internals? API returns only needed fields? PII handled properly?
- **Rate Limiting**: Applied? Brute force / DoS considered?
- **Encryption**: Passwords hashed (bcrypt/argon2)? Secrets in env? No hardcoded credentials?

### Step 2: Flag Issues

Report as: **CRITICAL** (fix immediately), **WARNING** (fix before deploy), **INFO** (consider).

### Step 3: Provide Secure Patterns

- Use Prisma/Zod for IDs and queries; never raw string interpolation in SQL.
- In production, return generic error messages; log details server-side.
- File uploads: validate type/size, use safe filenames (e.g. UUID + extension), restrict path.

Offer concrete code fixes for each finding. Ask: "Apply security fixes? (yes/no)".
