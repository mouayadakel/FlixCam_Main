# Bulk Product Import: Current Implementation vs User Story Requirements

## 📊 Executive Summary

**Current Status**: Basic implementation exists with core functionality, but missing several critical features from the user story.

**Gap Analysis**: ~60% complete - Core workflow exists, but missing advanced features like multi-sheet mapping UI, dry-run validation, translation services, image processing, and comprehensive error reporting.

---

## ✅ What's Currently Implemented

### 1. **File Upload & Basic Validation** ✅
- **Current**: `/admin/inventory/import` page exists
- **Features**:
  - File upload (`.xlsx`, `.xls`, `.csv`)
  - MIME type validation
  - File parsing with `xlsx` library
  - Max 5,000 rows limit
- **Status**: ✅ **COMPLETE** (matches requirements)

### 2. **Sheet Detection** ✅
- **Current**: Detects all sheets in Excel file
- **Features**:
  - Parses all sheets from workbook
  - Displays sheet names in UI
- **Status**: ✅ **COMPLETE** (matches requirements)

### 3. **Category Mapping** ⚠️ **PARTIAL**
- **Current**: Basic mapping exists but limited
- **Features**:
  - Can map one sheet at a time to category/subcategory
  - UI shows dropdown for category selection
- **Missing**:
  - ❌ Cannot map multiple sheets simultaneously
  - ❌ No preview of first 10 rows per sheet before mapping
  - ❌ Mapping UI only works one sheet at a time
- **Status**: ⚠️ **PARTIAL** - Works but not as specified in user story

### 4. **Background Processing** ✅
- **Current**: Async job processing implemented
- **Features**:
  - Creates `ImportJob` record
  - Returns `jobId` immediately
  - Processes in background (fire-and-forget with `setImmediate`)
  - Job status tracking
- **Status**: ✅ **COMPLETE** (basic implementation, but should use proper queue)

### 5. **Real-Time Monitoring** ✅
- **Current**: Polling mechanism exists
- **Features**:
  - Polls `/api/admin/imports/{jobId}/status` every 2 seconds
  - Displays progress: total, processed, success, error counts
  - Shows job status
- **Status**: ✅ **COMPLETE** (matches requirements)

### 6. **Product Creation Logic** ✅
- **Current**: `import-worker.ts` processes rows
- **Features**:
  - Brand auto-creation (normalize: trim, lowercase)
  - Draft status if `Daily_Price` missing/invalid ✅
  - Auto-calculates weekly/monthly prices
  - NEVER populates `box_contents` (always NULL) ✅
  - Handles multiple column name variations
- **Status**: ✅ **COMPLETE** (matches core requirements)

### 7. **Error Tracking** ⚠️ **PARTIAL**
- **Current**: Basic error tracking exists
- **Features**:
  - Row-level error logging
  - Error messages stored in `ImportJobRow.error`
  - Error display in UI
- **Missing**:
  - ❌ No downloadable CSV error report
  - ❌ No retry failed rows functionality
  - ❌ No rollback functionality
- **Status**: ⚠️ **PARTIAL** - Basic tracking exists, but missing advanced features

---

## ❌ What's Missing from User Story

### 1. **Multi-Sheet Mapping UI** ❌ **CRITICAL**
- **Required**: Map ALL sheets to categories before import starts
- **Current**: Only one sheet at a time
- **Gap**: User story requires mapping all sheets upfront, current UI forces sequential mapping

### 2. **Dry Run Validation** ❌ **MISSING**
- **Required**: `POST /api/admin/imports/validate` endpoint
- **Features Needed**:
  - Validate all data without creating products
  - Check SKU duplicates
  - Validate required fields
  - Validate data types
  - Validate image URLs
  - Return downloadable error report
- **Status**: ❌ **NOT IMPLEMENTED**

### 3. **Translation Service Integration** ❌ **MISSING**
- **Required**: Auto-translate to Arabic & Chinese
- **Features Needed**:
  - Batch translation (100 products/API call)
  - Fallback on API failure
  - Generate SEO fields (meta_title, meta_description, meta_keywords)
- **Current**: Only creates English translations
- **Status**: ❌ **NOT IMPLEMENTED**

### 4. **Image Processing** ❌ **MISSING**
- **Required**: Download images from URLs and upload to CDN
- **Features Needed**:
  - Download images from URLs (10s timeout)
  - Upload to CDN
  - Log errors if fetch fails
  - Create product with placeholder if image fetch fails
- **Current**: Only stores image URL as string
- **Status**: ❌ **NOT IMPLEMENTED**

### 5. **Advanced Error Reporting** ❌ **MISSING**
- **Required Endpoints**:
  - `GET /api/admin/imports/:id/errors.csv` - Download error report
  - `POST /api/admin/imports/:id/retry` - Retry failed rows
  - `DELETE /api/admin/imports/:id/rollback` - Rollback entire import
- **Status**: ❌ **NOT IMPLEMENTED**

### 6. **Security Features** ⚠️ **PARTIAL**
- **Required**:
  - ✅ MIME type validation (implemented)
  - ❌ Virus scanning (ClamAV) - NOT IMPLEMENTED
  - ❌ SSRF protection on image URLs - NOT IMPLEMENTED
  - ❌ XSS prevention (sanitize product names/descriptions) - NOT IMPLEMENTED
  - ⚠️ Rate limiting: 3 imports/user/hour, 10 concurrent system-wide - Basic rate limiting exists but not specific limits
  - ✅ Admin/inventory_manager role required - Implemented via auth check

### 7. **Performance Optimizations** ⚠️ **PARTIAL**
- **Required**:
  - ✅ Batch inserts (100 products at a time) - Implemented in worker
  - ❌ Pre-load existing SKUs and brands into Redis cache - NOT IMPLEMENTED
  - ❌ Defer image processing to separate queue - NOT IMPLEMENTED
  - ❌ Batch translations (100 products/API call) - NOT IMPLEMENTED
  - ✅ Database indexes on SKU, brand_name, import_job_id - Check schema

### 8. **File Size & Row Validation** ⚠️ **PARTIAL**
- **Required**: 
  - ✅ Max 5,000 rows (implemented)
  - ❌ Max 50MB file size check - NOT IMPLEMENTED
  - ❌ 413 error for files >5,000 rows - Currently just stops processing

### 9. **Preview Functionality** ⚠️ **PARTIAL**
- **Required**: Preview first 10 rows per sheet for verification
- **Current**: Shows first 200 rows, but only for selected sheet
- **Gap**: Should show preview for ALL sheets before mapping

### 10. **Column Auto-Detection** ⚠️ **PARTIAL**
- **Required**: Auto-detect column mappings (SKU, Product_Name, Brand, Daily_Price, Image_URL)
- **Current**: Supports multiple column name variations but doesn't auto-detect/suggest mappings
- **Gap**: Should show column mapping UI before import

---

## 📋 Detailed Feature Comparison

| Feature | User Story Requirement | Current Implementation | Status |
|---------|----------------------|----------------------|--------|
| **File Upload** | `.xlsx`, `.xls`, `.csv`, `.tsv` (max 50MB, 5,000 rows) | `.xlsx`, `.xls`, `.csv` (5,000 rows, no size check) | ⚠️ Partial |
| **Multi-Sheet Support** | Parse all sheets, map each to category | Parses all sheets, but maps one at a time | ⚠️ Partial |
| **Sheet Mapping UI** | Map all sheets before import starts | Sequential mapping only | ❌ Missing |
| **Preview Rows** | First 10 rows per sheet | First 200 rows for selected sheet | ⚠️ Partial |
| **Dry Run Validation** | Validate without creating products | Not implemented | ❌ Missing |
| **Background Job** | Queue job, return jobId | Fire-and-forget with setImmediate | ⚠️ Partial |
| **Real-Time Progress** | Poll every 2s, show progress/ETA | Polls every 2s, shows progress | ✅ Complete |
| **Brand Auto-Creation** | Create missing brands (normalize) | Implemented | ✅ Complete |
| **Draft Status** | Set to Draft if price missing | Implemented | ✅ Complete |
| **SEO Generation** | Auto-generate meta fields | Not implemented | ❌ Missing |
| **Translation** | Translate to AR/ZH (batch 100) | Not implemented | ❌ Missing |
| **Image Processing** | Download from URLs, upload to CDN | Not implemented | ❌ Missing |
| **box_contents** | Always NULL (never populate) | Always NULL | ✅ Complete |
| **Error Tracking** | Row-level errors, downloadable CSV | Row-level errors only | ⚠️ Partial |
| **Error Report** | Downloadable CSV | Not implemented | ❌ Missing |
| **Retry Failed Rows** | POST endpoint to retry | Not implemented | ❌ Missing |
| **Rollback** | DELETE endpoint to rollback | Not implemented | ❌ Missing |
| **Virus Scanning** | ClamAV before processing | Not implemented | ❌ Missing |
| **SSRF Protection** | Allowlist validation on image URLs | Not implemented | ❌ Missing |
| **XSS Prevention** | Sanitize inputs | Not implemented | ❌ Missing |
| **Rate Limiting** | 3 imports/user/hour, 10 concurrent | Basic rate limiting exists | ⚠️ Partial |
| **Redis Caching** | Pre-load SKUs and brands | Not implemented | ❌ Missing |
| **Batch Processing** | 100 products per transaction | Implemented | ✅ Complete |
| **Column Auto-Detection** | Auto-detect column mappings | Not implemented | ❌ Missing |

---

## 🎯 Priority Gaps to Address

### **HIGH PRIORITY** (Critical for MVP)
1. **Multi-Sheet Mapping UI** - Users need to map all sheets before import
2. **Translation Service** - Required for Arabic/Chinese support
3. **Image Processing** - Download and upload images to CDN
4. **Dry Run Validation** - Essential for data quality
5. **Error Report Download** - Users need CSV export of errors

### **MEDIUM PRIORITY** (Important for Production)
6. **Retry Failed Rows** - Improve user experience
7. **Rollback Functionality** - Safety feature
8. **Security Enhancements** - Virus scanning, SSRF protection, XSS prevention
9. **Performance Optimizations** - Redis caching, separate image queue
10. **Column Auto-Detection** - Better UX

### **LOW PRIORITY** (Nice to Have)
11. **File Size Validation** - 50MB limit
12. **413 Error for Large Files** - Proper HTTP status
13. **Preview All Sheets** - Better UX

---

## 🔧 Implementation Recommendations

### Phase 1: Core Missing Features (Week 1-2)
1. Implement multi-sheet mapping UI
2. Add dry-run validation endpoint
3. Integrate translation service (AR/ZH)
4. Implement image download/upload to CDN
5. Add error report CSV download

### Phase 2: Security & Performance (Week 3)
1. Add virus scanning (ClamAV)
2. Implement SSRF protection for image URLs
3. Add XSS sanitization
4. Implement Redis caching for SKUs/brands
5. Set up proper job queue (Bull/BullMQ)

### Phase 3: Advanced Features (Week 4)
1. Add retry failed rows functionality
2. Implement rollback functionality
3. Add column auto-detection UI
4. Improve preview functionality
5. Add file size validation

---

## 📝 Code Locations

### Current Implementation Files:
- **UI**: `/src/app/admin/(routes)/inventory/import/page.tsx`
- **API**: `/src/app/api/admin/imports/route.ts`
- **Status API**: `/src/app/api/admin/imports/[id]/route.ts`
- **Service**: `/src/lib/services/import.service.ts`
- **Worker**: `/src/lib/services/import-worker.ts`
- **Schema**: `prisma/schema.prisma` (ImportJob, ImportJobRow models)

### Files Needing Updates:
1. `import/page.tsx` - Add multi-sheet mapping UI
2. `imports/route.ts` - Add dry-run validation, file size check
3. `imports/[id]/route.ts` - Add error CSV download, retry, rollback
4. `import-worker.ts` - Add translation, image processing, SEO generation
5. `import.service.ts` - Add validation methods, error report generation

---

## 🎬 Next Steps

1. **Review this comparison** with stakeholders
2. **Prioritize missing features** based on business needs
3. **Create implementation plan** for selected features
4. **Set up infrastructure** (translation API, image CDN, job queue, Redis)
5. **Implement features** in priority order

---

**Document Version**: 1.0  
**Last Updated**: January 27, 2026  
**Comparison Date**: January 27, 2026
