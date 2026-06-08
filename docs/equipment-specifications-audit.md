# Equipment Specifications System: Audit & Remediation

**Project:** FlixCam (`flixcam.rent`)  
**Scope:** End-to-end audit of equipment specifications (schema, APIs, UI, import, AI, sync, compare).  
**Companion remediation:** See **Session addendum** for implemented code changes.

---

## Source-of-truth policy (post-remediation)

- **`Equipment.specifications`** is authoritative for customer-facing rental catalog and compare.
- **`Product` / `ProductTranslation.specifications`** are kept aligned via **`syncEquipmentToProduct`** after equipment create and after equipment update when specifications change (Option A).

---

# Phase 1 — System Discovery & Inventory

## 1.1 Primary codebase

Audit focused on [`/home/flixcam.rent/`](/home/flixcam.rent/) (exclude historical copies such as `app-nested-backup/`).

## 1.2 Representative modules

| Area | Paths (purpose) |
|------|-----------------|
| Schema | [`prisma/schema.prisma`](/home/flixcam.rent/prisma/schema.prisma) — `Equipment`, `Product`, `ProductTranslation` |
| Types | [`src/lib/types/specifications.types.ts`](/home/flixcam.rent/src/lib/types/specifications.types.ts) |
| Utils | [`src/lib/utils/specifications.utils.ts`](/home/flixcam.rent/src/lib/utils/specifications.utils.ts), [`src/lib/utils/specifications-import.utils.ts`](/home/flixcam.rent/src/lib/utils/specifications-import.utils.ts) |
| Validation | [`src/lib/validators/equipment.validator.ts`](/home/flixcam.rent/src/lib/validators/equipment.validator.ts) |
| Services | [`src/lib/services/equipment.service.ts`](/home/flixcam.rent/src/lib/services/equipment.service.ts), [`src/lib/services/product-equipment-sync.service.ts`](/home/flixcam.rent/src/lib/services/product-equipment-sync.service.ts), [`src/lib/services/import-worker.ts`](/home/flixcam.rent/src/lib/services/import-worker.ts) |
| Admin APIs | [`src/app/api/admin/equipment/*`](/home/flixcam.rent/src/app/api/admin/equipment/) — audit, migrate, convert, ai-suggest, fetch-specs |
| Public APIs | [`src/app/api/public/equipment/*`](/home/flixcam.rent/src/app/api/public/equipment/), [`src/app/api/public/compare/*`](/home/flixcam.rent/src/app/api/public/compare/) |
| Vendor APIs | [`src/app/api/vendor/equipment/*`](/home/flixcam.rent/src/app/api/vendor/equipment/) |
| UI | [`src/components/forms/specifications-editor.tsx`](/home/flixcam.rent/src/components/forms/specifications-editor.tsx), [`src/components/features/equipment/specs-panel.tsx`](/home/flixcam.rent/src/components/features/equipment/specs-panel.tsx), admin edit [`src/app/admin/(routes)/inventory/equipment/[id]/edit/page.tsx`](/home/flixcam.rent/src/app/admin/(routes)/inventory/equipment/[id]/edit/page.tsx) |

## 1.3 Data model (summary)

- **`Equipment`:** `specifications` (Json), `customFields` (Json), `specBlacklist`, `specConfidence`, `specLastInferredAt`, `specSource`, `aiSuggestions`, links to `Product` via `productId`.
- **`ProductTranslation`:** `specifications` (Json) — locale-specific; staging for import/AI; should follow Option A sync from Equipment.

## 1.4 API surface (summary)

- **Staff:** `GET/POST /api/equipment`, `GET/PATCH/DELETE /api/equipment/[id]` — full CRUD; specs in body.
- **Admin tools:** audit, bulk convert, migrate, rollback, AI suggest, URL fetch.
- **Public:** list (summary, often no full specs), detail (full specs), compare endpoints, AI compare summary.
- **Vendor:** list/create/update own equipment; specs as flat record where allowed.

## 1.5 UI (summary)

- **Admin:** rich structured editor, live preview, AI dialog, audit dialog, import validator.
- **Public:** `SpecsPanel` / `SpecificationsDisplay`, compare pages.
- **Vendor:** limited; specs not always editable in UI.

---

# Phase 2 — Case Story (System Narrative)

The platform rents professional camera and production equipment. **Specifications** power product detail pages, SEO-adjacent content, comparison, and operator trust. Data arrives as **flat** key-value pairs (imports, vendors) or **structured** groups (highlights, quick specs, grouped rows). The system normalizes toward **structured** specs using **category templates**, **AI** (infer, URL extract), and **admin migration** tools. **Product → Equipment** sync runs after import; **Equipment → Product** sync (Option A) aligns `ProductTranslation.specifications` when staff save equipment so AI and catalog layers do not diverge.

---

# Phase 3 — User Stories (abbreviated)

| Actor | Story |
|-------|--------|
| Admin | As an admin, I want to edit structured specs with templates and AI so the catalog is accurate and consistent. |
| Customer | As a customer, I want to see specs and compare models so I can choose the right gear. |
| Vendor | As a vendor, I want to submit equipment so it can be listed after review (specs often incomplete without admin). |
| System | As the system, I want import and AI pipelines to normalize specs and track confidence/source. |

**Missing / weak:** vendor structured editor; enforced “complete spec” per category; full provenance UI (partially addressed in addendum).

---

# Phase 4 — Flow Maps (summary)

- **Entry:** Admin form → `PATCH /api/equipment/[id]` → `EquipmentService` → DB; optional `syncEquipmentToProduct`.
- **Read:** Public page → API/cache → `Equipment` + `specifications` → `SpecsPanel`.
- **Import:** Rows → Product → `syncProductToEquipment` → Equipment.
- **Errors:** Validation (Zod), image gates for active/featured, sync failures surfaced as warnings where implemented.

---

# Phase 5 — Field-by-Field Specification Audit (summary)

Structured JSON includes: `groups[]` (`SpecItem`: key, label, value, type, highlight, rangePercent), `highlights`, `quickSpecs`, optional `customHtml`. Metadata on `Equipment`: `specSource`, `specConfidence` (0–1), `specLastInferredAt`, `specBlacklist`, `aiSuggestions`. **customFields** may hold migration backup, tags, box contents, etc.

---

# Phase 6 — Gap Analysis (categories)

- **Validation:** Structured shape was historically loose; strict Zod + duplicate key rules added (see addendum).
- **Sync:** One-way Product→Equipment vs Equipment→Product; Option A addresses reverse sync on save.
- **Vendor / API:** Spec search/filter by key; export; validate-only endpoint — still open or partial.
- **Tests:** E2E for full spec pipeline; compare collision tests — improved with unit tests (addendum).
- **UX:** Governance visibility — panel added (addendum).

---

# Phase 7 — UI vs API (summary)

| Layer | Showing | Missing / partial |
|-------|---------|-------------------|
| Public list | Summary, not full specs | Spec-based filters |
| Public detail | Full `specifications` | Provenance badges |
| Admin | Full editor + audit | Historical spec diff (still optional) |

---

# Phase 8 — Deep Report

## Executive summary

- **Works:** Structured display, compare, admin editor, migration/audit tools, caching, permissions.
- **Risks:** Legacy flat data, confidence scale consistency across pipelines, compare key collisions (mitigated by unique keys in API).
- **Scores (indicative):** Schema 7/10, API 6/10, UI 7/10, Validation 5→7/10 after strict Zod, Tests 4→5/10, Docs 4→6/10 with this file.

## Prioritized issues (historical; see addendum for fixes)

1. **CRITICAL:** Loose structured validation → **strict schema + union order fix**.
2. **HIGH:** Product/Equipment spec divergence → **Option A sync**.
3. **HIGH:** Duplicate keys in flatten/compare → **Zod uniqueness + audit collision hints**.
4. **MEDIUM:** Audit “invalid” vs “quality” → **split validity vs quality** in audit API.
5. **MEDIUM:** Sync silent failure → **warnings on response**.

## Roadmap

- **Short term:** Strict validation, sync warnings, audit quality split, export CSV.
- **Mid term:** Governance UI, integration tests for sync.
- **Long term:** Spec index / search, revision history, vendor structured flows.

## Open questions

- Required keys per category for “publishable” tier?
- Canonical confidence scale across import vs admin (0–1 enforced in validator).

---

# Session addendum — Implemented code (this remediation)

The following matches the current codebase under `flixcam.rent`:

1. **`EquipmentService.sync` (Option A)**  
   - After **`createEquipment`**, calls **`syncEquipmentToProduct(equipment.id)`** (try/catch).  
   - After **`updateEquipment`**, if **`specifications`** was in the payload, compares normalized specs to previous JSON; **runs sync only when specs actually changed**; failures attach to **`warnings.syncToProduct`**.

2. **Normalization**  
   - **`normalizeSpecificationsForStorage`**: If payload is already structured, deep-clone; if **flat**, **`convertFlatToStructured`** with category hint from **`resolveTemplateName`**.

3. **Validation**  
   - **`structuredSpecificationsSchema`** in [`equipment.validator.ts`](/home/flixcam.rent/src/lib/validators/equipment.validator.ts): icon enum, **duplicate spec keys across groups**, **duplicate group priority**, **`rangePercent` required for `type: range`**.  
   - **Union order:** structured schema is listed **before** `z.record(...)`.  
   - **`superRefine`:** if the payload has a **`groups`** array, it must pass **`structuredSpecificationsSchema`** — this prevents invalid structured objects from matching only the loose record branch of the union.

4. **Tests**  
   - [`equipment.service.test.ts`](/home/flixcam.rent/src/lib/services/__tests__/equipment.service.test.ts) mocks **`syncEquipmentToProduct`** and transaction client.  
   - Validator tests extended for structured specs (duplicate keys, range type).

5. **Audit API**  
   - **`validityIssues`** vs **`qualityIssues`** (and optional key collisions) on each item; summary counts use validity for “invalid” where applicable.

6. **Utilities**  
   - **`detectSpecKeyCollisions`** (or equivalent) in [`specifications.utils.ts`](/home/flixcam.rent/src/lib/utils/specifications.utils.ts) for audit/quality.

7. **Export**  
   - **`GET /api/admin/equipment/audit-specifications?format=csv`** for CSV download; audit dialog includes **تصدير CSV**.

8. **Admin UI**  
   - **Spec governance** card on equipment edit (source, confidence, last inferred, blacklist summary, last sync warning from save response).

---

## References

- Internal docs: [`docs/SPECIFICATIONS_SYSTEM_AUDIT_REPORT.md`](/home/flixcam.rent/docs/SPECIFICATIONS_SYSTEM_AUDIT_REPORT.md) (if present), [`docs/SPECIFICATIONS_SYSTEM_FULL_STATE_REPORT.md`](/home/flixcam.rent/docs/SPECIFICATIONS_SYSTEM_FULL_STATE_REPORT.md)

---

*End of consolidated audit document.*
