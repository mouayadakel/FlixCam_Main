# FlixCam Complete Codebase Audit Report

**Date:** February 20, 2025  
**Scope:** Full codebase audit, Excel import diagnosis, AI integration, UX/UI

---

## Phase 1: Architecture & Tech Stack Summary

### Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Shadcn UI, Radix UI
- **Backend:** Node.js, Prisma ORM, PostgreSQL
- **State:** Zustand, TanStack Query
- **Validation:** Zod
- **AI:** OpenAI (gpt-4o-mini), Google Gemini (gemini-1.5-flash)
- **Queue:** BullMQ + Redis (import, backfill, AI processing)
- **Auth:** NextAuth v5 (beta)

### Key Directories

- `src/app/` — App Router pages and API routes
- `src/components/` — UI components (ui/, features/, layouts/, shared/)
- `src/lib/` — Services, auth, queue, validators, utils
- `prisma/` — Schema, migrations, seed

### Database Models (High Level)

- Product, Equipment, ImportJob, ImportJobRow, AIProcessingJob, AiJob, AiContentDraft
- User, Role, Permission, Booking, Payment, Invoice, etc.

---

## Phase 2: Excel Import — Root Cause & Fixes

### Bugs Found and Fixed

| #   | File                                            | Line | Issue                                                                                                           | Fix                                                                       |
| --- | ----------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | `src/lib/auth/permissions.ts`                   | 363  | **CRITICAL:** Admin role lacked `IMPORT_CREATE` and `IMPORT_READ` — all admin users got 403 Forbidden on import | Added `IMPORT_CREATE` and `IMPORT_READ` to admin role in ROLE_PERMISSIONS |
| 2   | `next.config.js`                                | 30   | No body size limit for file uploads — Next.js default may block large Excel files                               | Added `serverActions.bodySizeLimit: '50mb'`                               |
| 3   | `src/app/api/admin/imports/route.ts`            | -    | No maxDuration — long imports could timeout                                                                     | Added `export const maxDuration = 120`                                    |
| 4   | `src/app/api/admin/imports/sheets/route.ts`     | -    | No maxDuration for large file parsing                                                                           | Added `export const maxDuration = 60`                                     |
| 5   | `src/app/api/admin/imports/route.ts`            | 218  | `fileBuffer` passed to Redis queue — 50MB files would bloat Redis, worker doesn't use it                        | Removed fileBuffer from queue payload; worker reads from DB               |
| 6   | `src/lib/queue/import.queue.ts`                 | 61   | Type included `fileBuffer`                                                                                      | Removed from type                                                         |
| 7   | `src/app/api/admin/imports/[id]/retry/route.ts` | 80   | Passed `fileBuffer` to addImportJob                                                                             | Replaced with mapping derived from row payloads                           |
| 8   | `src/components/features/import/drop-zone.tsx`  | 17   | Missing `application/csv` MIME type — Safari sends this for .csv                                                | Added to ACCEPTED_TYPES                                                   |

### Import Flow (End-to-End)

1. **Frontend:** User selects file via DropZone or hidden input → `handleFileChange` → POST `/api/admin/imports/sheets` (FormData)
2. **Sheets API:** Parses file with xlsx, returns sheet metadata, columns, preview rows
3. **Frontend:** User maps sheets to categories, optionally runs AI Preview → POST `/api/admin/imports/preview-ai`
4. **Frontend:** User clicks Start Import → POST `/api/admin/imports` (FormData: file, mapping, selectedSheets, selectedRows, approvedSuggestions)
5. **Import API:** Creates ImportJob, parses file, appends rows to ImportJobRow, queues job (or processes sync if Redis unavailable)
6. **Worker:** `processImportJob` reads rows from DB, creates Products, syncs to Equipment

### Verification

- Admin users now have `import.create` permission
- File upload supports up to 50MB
- Queue no longer stores file buffer in Redis
- Retry route correctly builds mapping from row payloads

---

## Phase 3: AI Integration — Diagnosis & Fixes

### Issues Found and Fixed

| #   | File                                                   | Issue                                                           | Fix                                                                      |
| --- | ------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | `src/app/api/admin/equipment/ai-suggest/route.ts`      | Hardcoded `'gemini'` — failed when user only had OPENAI_API_KEY | Use `process.env.AI_PROVIDER` or body.provider, default `gemini`         |
| 2   | `src/components/features/import/ai-preview-dialog.tsx` | Generic error on missing API key                                | Added helpful message: "Add GEMINI_API_KEY or OPENAI_API_KEY to .env..." |
| 3   | `.env.example`                                         | AI_PROVIDER default was `openai`                                | Changed to `gemini` (often free tier); added comment                     |

### AI Flow

- **AI Preview (Import):** `handleAIPreview` → POST `/api/admin/imports/preview-ai` → `generateMasterFill` (ai-content-generation.service) → OpenAI or Gemini
- **Equipment AI Suggest:** Form triggers POST `/api/admin/equipment/ai-suggest` → inferMissingSpecs, generateSEOBatch, generateDescription, generateBoxContents, generateTags
- **Backfill:** BullMQ job → ai-autofill.service, ai-spec-parser.service

### Env Requirements

- `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` (for Gemini)
- `OPENAI_API_KEY` (for OpenAI)
- `AI_PROVIDER` = `gemini` or `openai` (optional; defaults to gemini in most places)

---

## Phase 4: UX/UI Fixes Applied

| #   | Component               | Fix                                                                            |
| --- | ----------------------- | ------------------------------------------------------------------------------ |
| 1   | `ai-preview-dialog.tsx` | Optional chaining for `finalSuggestion.seo?.metaTitle` etc. to prevent crashes |
| 2   | `ai-preview-dialog.tsx` | Clearer error message when API keys are missing                                |
| 3   | `drop-zone.tsx`         | Added `application/csv` for Safari compatibility                               |

---

## Phase 5: Prioritized Issue List

### Critical (Fixed)

- [x] Admin role missing IMPORT_CREATE → 403 on import
- [x] fileBuffer in Redis queue (memory bloat, worker doesn't use it)
- [x] Retry route passing fileBuffer (type error after queue change)

### High (Fixed)

- [x] Body size limit for Excel uploads
- [x] maxDuration for import routes
- [x] AI suggest hardcoded to Gemini
- [x] Missing application/csv MIME type

### Medium (Pre-existing)

- Type errors in equipment edit/new pages (SectionStatus)
- Test file mock issues (Prisma mockResolvedValue)
- product-similarity.service null vs undefined
- web-researcher.service type for manufacturer

### Low

- Consider adding IMPORT_READ to sheets route for consistency
- Consider rate limiting on preview-ai for cost control

---

## Verification Steps

1. **Excel Import:** Log in as admin → Admin → Inventory → Import → Upload .xlsx/.csv → Map categories → Start Import → Verify products created
2. **AI Preview:** Same flow → Click "Preview AI" → Verify suggestions load (requires GEMINI_API_KEY or OPENAI_API_KEY in .env)
3. **Equipment AI Suggest:** Admin → Inventory → Equipment → New → Enter name + category → Trigger AI suggest (if wired in form)

---

## Files Modified

- `src/lib/auth/permissions.ts` — Added IMPORT_CREATE, IMPORT_READ to admin
- `next.config.js` — serverActions.bodySizeLimit
- `src/app/api/admin/imports/route.ts` — maxDuration, removed fileBuffer from queue
- `src/app/api/admin/imports/sheets/route.ts` — maxDuration
- `src/lib/queue/import.queue.ts` — Removed fileBuffer from type
- `src/app/api/admin/imports/[id]/retry/route.ts` — Build mapping from payloads, no fileBuffer
- `src/app/api/admin/equipment/ai-suggest/route.ts` — Use AI_PROVIDER
- `src/components/features/import/ai-preview-dialog.tsx` — Error message, optional chaining
- `src/components/features/import/drop-zone.tsx` — application/csv
- `.env.example` — AI_PROVIDER default gemini
