# Production Readiness Checklist: Bulk Product Import

## 🔍 Workflow Analysis: User Story vs Current Implementation

### User Story Workflow (5 Phases)

#### ✅ Phase 1: File Upload & Validation

**User Story Requirement:**

- Admin navigates to `/admin/inventory/import`
- Uploads `.xlsx`, `.xls`, `.csv`, or `.tsv` (max 50MB, 5,000 rows)
- System validates: MIME type, virus scan, file size, row count

**Current Implementation:**

- ✅ Route exists: `/admin/inventory/import`
- ✅ Supports `.xlsx`, `.xls`, `.csv`
- ❌ Missing `.tsv` support
- ✅ MIME type validation
- ❌ No virus scanning (ClamAV)
- ❌ No file size check (50MB limit)
- ✅ Row count check (5,000 max)
- ⚠️ No 413 error for files >5,000 rows (just stops processing)

**Status**: ⚠️ **PARTIAL** - Missing security and file size validation

---

#### ⚠️ Phase 2: Sheet Detection & Mapping

**User Story Requirement:**

- Backend parses all sheets and returns metadata (sheet names, row counts, columns)
- Admin maps **each sheet** to target Category (required) and Subcategory (optional)
- Auto-detects column mappings (SKU, Product_Name, Brand, Daily_Price, Image_URL)
- Preview first 10 rows per sheet for verification

**Current Implementation:**

- ✅ Parses all sheets
- ✅ Returns sheet names
- ❌ Does NOT return row counts per sheet
- ❌ Does NOT return column names per sheet
- ❌ Maps **one sheet at a time** (not all sheets upfront)
- ❌ No column auto-detection UI
- ⚠️ Preview shows 200 rows (not 10) and only for selected sheet
- ❌ Cannot map all sheets before import starts

**Status**: ❌ **CRITICAL WORKFLOW MISMATCH** - User story requires mapping ALL sheets before import, current implementation forces sequential mapping

---

#### ❌ Phase 3: Dry Run Validation (Optional)

**User Story Requirement:**

- Validates all data without creating products
- Checks SKU duplicates, required fields, data types, image URLs
- Returns downloadable error report with row-level issues

**Current Implementation:**

- ❌ No dry-run validation endpoint
- ❌ No validation before import
- ❌ No duplicate SKU check before import
- ❌ No downloadable error report

**Status**: ❌ **MISSING** - Critical for data quality

---

#### ⚠️ Phase 4: Background Processing

**User Story Requirement:**

- Job queued (POST `/api/admin/imports/excel`) returns `jobId` immediately
- Worker processes rows in batches of 100 within transactions
- For each valid row:
  - Auto-create missing brands (normalize: trim, lowercase) ✅
  - Set status=Draft if Daily_Price missing/invalid ✅
  - Generate SEO fields: meta_title, meta_description, meta_keywords ❌
  - Translate to Arabic & Chinese (batch 100/call, fallback on API failure) ❌
  - Download & attach images (10s timeout, upload to CDN, log errors) ❌
  - NEVER populate box_contents (always NULL) ✅

**Current Implementation:**

- ✅ Returns `jobId` immediately
- ⚠️ Uses `setImmediate()` (fire-and-forget, not proper queue)
- ⚠️ Processes row-by-row (not in batches of 100)
- ✅ Brand auto-creation works
- ✅ Draft status logic works
- ❌ No SEO generation
- ❌ No translation service
- ❌ No image download/upload
- ✅ box_contents always NULL

**Status**: ⚠️ **PARTIAL** - Missing translation, SEO, image processing, and proper batching

---

#### ✅ Phase 5: Real-Time Monitoring

**User Story Requirement:**

- Frontend polls `GET /api/admin/imports/{jobId}/status` every 2 seconds
- Displays: Progress bar, current row, success/failure counts, ETA
- Admin can cancel job or navigate away (job continues in background)

**Current Implementation:**

- ✅ Polls every 2 seconds
- ✅ Shows progress, success/failure counts
- ❌ No progress bar visualization
- ❌ No current row display
- ❌ No ETA calculation
- ❌ No cancel job functionality

**Status**: ⚠️ **PARTIAL** - Basic monitoring works, missing UX enhancements

---

## 🚨 CRITICAL WORKFLOW ISSUES

### Issue 1: Multi-Sheet Mapping Workflow Mismatch

**Problem**: User story requires mapping ALL sheets before import starts. Current implementation forces sequential mapping (one sheet at a time).

**Impact**:

- Users must import sheets one-by-one
- Cannot see all mappings at once
- No way to validate all mappings before starting
- Doesn't match user story requirements

**Fix Required**:

- Create table-based UI showing all sheets
- Allow mapping all sheets before import
- Validate all sheets are mapped before proceeding

---

### Issue 2: Missing Dry-Run Validation

**Problem**: No way to validate data before import starts.

**Impact**:

- Users discover errors only after import starts
- Wasted time and resources
- Poor user experience

**Fix Required**:

- Add `POST /api/admin/imports/validate` endpoint
- Validate all rows without creating products
- Return comprehensive error report

---

### Issue 3: Background Processing Not Production-Ready

**Problem**: Uses `setImmediate()` instead of proper job queue.

**Impact**:

- Jobs lost on server restart
- No retry mechanism
- No concurrency control
- No job persistence

**Fix Required**:

- Implement BullMQ/Bull with Redis
- Proper job queue infrastructure

---

## 📋 PRODUCTION READINESS CHECKLIST

### 🔴 P0 - CRITICAL (Blocking Production)

#### Infrastructure & Architecture

- [ ] **Job Queue System** - Replace `setImmediate()` with BullMQ/Bull
  - [ ] Redis setup and configuration
  - [ ] Job persistence
  - [ ] Retry mechanism with exponential backoff
  - [ ] Concurrency control (10 concurrent max)
  - [ ] Dead letter queue for failed jobs
  - [ ] Job priority queues

- [ ] **Multi-Sheet Mapping UI** - Fix workflow mismatch
  - [ ] Table showing all sheets with mappings
  - [ ] Map all sheets before import starts
  - [ ] Preview first 10 rows per sheet inline
  - [ ] Validation that all sheets are mapped
  - [ ] Visual indicators for mapped/unmapped sheets

- [ ] **Dry Run Validation** - Essential for data quality
  - [ ] `POST /api/admin/imports/validate` endpoint
  - [ ] Validate all rows without creating products
  - [ ] Check SKU duplicates
  - [ ] Validate required fields
  - [ ] Validate data types
  - [ ] Validate image URLs
  - [ ] Return downloadable error report

- [ ] **Translation Service Integration** - Core business requirement
  - [ ] Integrate translation API (Google Translate, DeepL, or custom)
  - [ ] Batch translation (100 products/call)
  - [ ] Fallback strategy on API failure
  - [ ] Generate SEO fields (meta_title, meta_description, meta_keywords)
  - [ ] Cache translations to avoid re-translating

- [ ] **Image Processing Pipeline** - Security & functionality
  - [ ] Download images from URLs (10s timeout)
  - [ ] Upload to CDN (Cloudinary, AWS S3, or similar)
  - [ ] Image optimization (resize, compress)
  - [ ] SSRF protection (URL allowlist validation)
  - [ ] Placeholder fallback on failure
  - [ ] Separate queue for image processing

---

### 🟠 P1 - HIGH PRIORITY (Production Quality)

#### Security

- [ ] **Virus Scanning** - ClamAV integration
  - [ ] Scan files before processing
  - [ ] Reject infected files
  - [ ] Log scan results

- [ ] **SSRF Protection** - Image URL validation
  - [ ] URL allowlist validation
  - [ ] Block private IP ranges
  - [ ] Validate URL format

- [ ] **XSS Prevention** - Input sanitization
  - [ ] Sanitize product names
  - [ ] Sanitize descriptions (HTML)
  - [ ] Sanitize all text fields

- [ ] **Rate Limiting** - Specific limits
  - [ ] 3 imports/user/hour
  - [ ] 10 concurrent system-wide
  - [ ] Proper rate limit headers

- [ ] **File Size Validation** - 50MB limit
  - [ ] Check file size before processing
  - [ ] Return 413 error for oversized files
  - [ ] Clear error messages

#### Error Handling & Recovery

- [ ] **Error Report Download** - CSV export
  - [ ] `GET /api/admin/imports/:id/errors.csv` endpoint
  - [ ] Row-level error details
  - [ ] Error categorization
  - [ ] Downloadable format

- [ ] **Retry Failed Rows** - Recovery mechanism
  - [ ] `POST /api/admin/imports/:id/retry` endpoint
  - [ ] Retry only failed rows
  - [ ] Preserve successful imports

- [ ] **Rollback Functionality** - Safety feature
  - [ ] `DELETE /api/admin/imports/:id/rollback` endpoint
  - [ ] Delete all products from import
  - [ ] Restore previous state
  - [ ] Audit trail

#### Performance

- [ ] **Redis Caching** - Pre-load data
  - [ ] Cache existing SKUs
  - [ ] Cache existing brands
  - [ ] Cache category/subcategory mappings
  - [ ] Invalidate cache on updates

- [ ] **Batch Processing** - Proper batching
  - [ ] Process 100 products per transaction
  - [ ] Transaction rollback on batch failure
  - [ ] Progress tracking per batch

- [ ] **Database Optimization** - Query performance
  - [ ] Index on SKU, brand_name, import_job_id
  - [ ] Connection pooling
  - [ ] Query optimization (avoid N+1)
  - [ ] Read replicas for validation

#### User Experience

- [ ] **Column Auto-Detection** - Better UX
  - [ ] Auto-detect column mappings
  - [ ] Visual column mapping UI
  - [ ] Manual override capability
  - [ ] Validation of mappings

- [ ] **Progress Visualization** - Enhanced monitoring
  - [ ] Progress bar component
  - [ ] Current row being processed
  - [ ] ETA calculation
  - [ ] Speed indicator (rows/second)

- [ ] **Cancel Job** - User control
  - [ ] Cancel button in UI
  - [ ] API endpoint to cancel
  - [ ] Graceful job cancellation
  - [ ] State cleanup

---

### 🟡 P2 - MEDIUM PRIORITY (Nice to Have)

#### File Format Support

- [ ] **TSV Support** - Add `.tsv` file type
  - [ ] MIME type validation
  - [ ] Parser for TSV format
  - [ ] Error handling

#### Validation Enhancements

- [ ] **413 Error for Large Files** - Proper HTTP status
  - [ ] Return 413 Payload Too Large
  - [ ] Clear error message
  - [ ] Suggest file splitting

#### Preview Improvements

- [ ] **Preview All Sheets** - Better UX
  - [ ] Show preview for all sheets
  - [ ] First 10 rows per sheet (as per spec)
  - [ ] Expandable preview sections

#### Monitoring & Analytics

- [ ] **Import Analytics** - Performance tracking
  - [ ] Success rate over time
  - [ ] Average import time
  - [ ] Common error patterns
  - [ ] Dashboard

---

## 🔧 IMPLEMENTATION PRIORITY

### Week 1: Critical Foundation

1. ✅ Set up BullMQ job queue with Redis
2. ✅ Fix multi-sheet mapping UI (all sheets upfront)
3. ✅ Add dry-run validation endpoint
4. ✅ Integrate translation service
5. ✅ Implement image processing pipeline

### Week 2: Security & Quality

6. ✅ Virus scanning (ClamAV)
7. ✅ SSRF protection for image URLs
8. ✅ XSS sanitization
9. ✅ Error report CSV download
10. ✅ Retry failed rows functionality

### Week 3: Performance & UX

11. ✅ Redis caching for SKUs/brands
12. ✅ Proper batch processing (100 per transaction)
13. ✅ Column auto-detection UI
14. ✅ Enhanced progress visualization
15. ✅ Cancel job functionality

### Week 4: Polish & Enhancement

16. ✅ Rollback functionality
17. ✅ TSV support
18. ✅ File size validation (50MB)
19. ✅ Preview all sheets
20. ✅ Import analytics

---

## ✅ WORKFLOW VERIFICATION

### Current Workflow (INCORRECT)

```
1. Upload file
2. Select one sheet
3. Map that sheet to category
4. Preview rows (200 rows)
5. Select rows to import
6. Start import (only for that sheet)
7. Repeat for next sheet...
```

**Problem**: Sequential, one sheet at a time

---

### Required Workflow (Per User Story)

```
1. Upload file
2. System detects all sheets
3. Show all sheets with metadata (row counts, columns)
4. Map ALL sheets to categories (required step)
5. Preview first 10 rows per sheet
6. (Optional) Dry-run validation
7. Start import for ALL mapped sheets
8. Monitor progress in real-time
```

**Correct**: All sheets mapped upfront, then single import

---

## 🎯 PRODUCTION READINESS SCORE

| Category            | Current | Required | Gap     |
| ------------------- | ------- | -------- | ------- |
| **Infrastructure**  | 30%     | 100%     | 70%     |
| **Workflow**        | 40%     | 100%     | 60%     |
| **Security**        | 20%     | 100%     | 80%     |
| **Performance**     | 50%     | 100%     | 50%     |
| **User Experience** | 60%     | 100%     | 40%     |
| **Error Handling**  | 40%     | 100%     | 60%     |
| **Overall**         | **38%** | **100%** | **62%** |

---

## 🚀 RECOMMENDATION

**Current State**: Not production-ready (38% complete)

**Minimum for Production**:

- Complete all P0 items (Critical)
- Complete 80% of P1 items (High Priority)

**Estimated Time**: 3-4 weeks of focused development

**Risk Assessment**:

- **HIGH RISK** if deployed as-is
- Jobs can be lost
- Security vulnerabilities
- Missing core features (translation, images)
- Poor user experience

**Action Plan**:

1. **STOP** - Do not deploy to production
2. **FIX** - Complete P0 items first (Week 1)
3. **TEST** - Thorough testing after P0 completion
4. **DEPLOY** - Only after P0 + 80% P1 complete
5. **ITERATE** - Add P2 items based on user feedback

---

**Document Version**: 1.0  
**Last Updated**: January 27, 2026  
**Status**: ⚠️ **NOT PRODUCTION READY**
