# AI Preview Workflow — Proposal

**Date:** 2026-02-18  
**Status:** Proposal (not yet implemented)  
**Goal:** AI suggests → human previews & edits → approves. Not auto-fill-and-commit.

---

## Current State (Problems)

### 1. Misleading data

- **AI Dashboard** reads from **Product** (synced from Equipment).
- **Equipment pages** (where you manage items) read from **Equipment** + **Translation** (entityType: equipment).
- Backfill writes to **Product** (ProductTranslation, ProductImage). Equipment stays separate.
- So: dashboard shows "content filled" but equipment detail page can show empty content.

### 2. Image preview

- Pending images use Cloudinary URLs. `res.cloudinary.com` added to `next.config.js` for `next/image`.
- Product name fallback improved (ar → en → sku → id) so lightbox title always shows.

### 3. No preview for text/specs

- **Current flow:** Backfill runs → AI generates text (description, SEO, specs) → **writes directly to DB**.
- Only **images** have review: `ProductImage.pendingReview = true` → Image Review tab → approve/reject.
- **Specs, description, SEO, recommended items** are auto-committed with no preview.

### 4. AI as filler, not thinker

- Prompts are tuned for "fill missing fields" not "think about context, category, brand, use case".
- No reasoning or confidence shown to the user.
- No way to edit AI output before it goes live.

---

## Proposed: AI Suggest → Preview → Approve

### Phase 1: Preview for all AI content

| Content type          | Current                                    | Proposed                                          |
| --------------------- | ------------------------------------------ | ------------------------------------------------- |
| **Images**            | pendingReview → approve/reject             | Keep as-is (already works)                        |
| **Description**       | Auto-saved to ProductTranslation           | Generate → show in preview panel → edit → approve |
| **SEO**               | Auto-saved                                 | Same                                              |
| **Specs**             | Auto-saved (confidence ≥90%) or suggestion | Always show in preview → edit → approve           |
| **Recommended items** | Kit builder suggests → user edits in form  | Keep (already previewable)                        |

### Phase 2: Staging model

Introduce a **draft/staging** layer so AI output is not written to live data until approved:

```
Option A: AiContentDraft table
  - productId, type (description|seo|specs|images)
  - suggestedData (JSON)
  - status: pending | approved | rejected
  - createdAt, reviewedAt, reviewedBy

Option B: In-memory / session
  - AI generates → return to frontend
  - User edits in modal/panel
  - On "Approve" → API writes to Product/Equipment
  - No DB staging (simpler, but no audit of suggestions)
```

### Phase 3: UI flow (example: item upload)

1. **User uploads item** → enters name (and maybe category/brand).
2. **"AI Suggest"** button → calls API that:
   - Infers specs (with confidence per field)
   - Generates short + long description
   - Generates SEO (title, description, keywords)
   - Optionally suggests related equipment
3. **Preview panel** shows:
   - Specs (editable, with confidence badges)
   - Description (editable textarea)
   - SEO (editable fields)
   - Related items (selectable list)
4. **User edits** as needed.
5. **"Apply"** → saves to Equipment (or Product if we keep Product as content source).
6. **"Reject"** → discards, user keeps manual entry.

### Phase 4: Smarter AI

- Add **reasoning** to prompts: "Explain briefly why you chose this value."
- Show **confidence** per field (e.g. 95% for sensor size from model name, 60% for weight).
- Use **context**: category, brand, similar products, region (Saudi B2B rental).
- **No auto-save** for low confidence; always require human review for high-impact fields.

---

## Implementation order

1. **Fix image preview** — Cloudinary in `next.config`, product name fallback (done).
2. **Align Product vs Equipment** — Decide: sync Product→Equipment on approve, or make dashboard use Equipment. Reduces "misleading" gap.
3. **Add "AI Suggest" on equipment form** — Generate specs/description/SEO, return JSON, show in modal. User edits, then saves. No new tables.
4. **Add staging table** (optional) — If we want audit trail of suggestions and rejections.
5. **Improve prompts** — More context, reasoning, confidence in responses.

---

## Quick win: Suggest-only API (no DB write)

Add `/api/admin/equipment/[id]/ai-suggest`:

- **POST** with `{ types: ['specs','description','seo'] }`
- Calls `inferMissingSpecs`, `autofillMissingFields` (or similar) but **returns result as JSON**, does not write to DB.
- Frontend shows result in a "Preview" panel; user edits and saves via normal equipment form.

This gives preview without changing the backfill worker or adding new tables.
