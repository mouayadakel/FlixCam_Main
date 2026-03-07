# Import Issue Diagnosis

## Problem Identified

**Issue**: No equipment is being uploaded from Excel files.

**Root Cause**: The background workers that process import jobs are **not running**.

## Current Status

- ✅ Redis is running
- ✅ Import jobs are being created successfully
- ✅ Rows are being parsed and stored in the database
- ✅ Category mappings are present
- ❌ **Workers are NOT running** - this is the problem

## Evidence

From diagnostic script (`scripts/check-import-status.ts`):

```
=== Job Status ===
- 10+ import jobs found, all in PENDING status
- All jobs have rows with category mappings
- 0 rows processed, 0 products created

=== Queue Status ===
- Waiting jobs: 0
- Active jobs: 0
- Completed jobs: 0
- Failed jobs: 0
```

**This means**: Jobs are being added to the database but the worker process that picks them up from the queue is not running.

## Solution

### Option 1: Start Workers (Recommended for Production)

Start the background workers in a separate terminal:

```bash
npm run worker:all
```

This will start:

- Import worker (processes Excel files)
- AI processing worker (generates translations/SEO)
- Image processing worker (uploads images to Cloudinary)

**Keep this terminal running** - workers need to stay active to process jobs.

### Option 2: Process Pending Jobs Manually

If you want to process existing pending jobs without starting workers, you can use the manual processing script:

```bash
npx tsx scripts/process-pending-imports.ts
```

## How It Works

1. **File Upload**: User uploads Excel file via `/admin/inventory/import`
2. **Job Creation**: API creates an `ImportJob` record in database
3. **Row Parsing**: Excel rows are parsed and stored as `ImportJobRow` records
4. **Queue Addition**: Job is added to BullMQ queue (requires Redis)
5. **Worker Processing**: Background worker picks up job and processes rows
6. **Product Creation**: Each row creates a product via `ProductCatalogService.create()`

**The issue is at step 5** - workers are not running to pick up jobs from the queue.

## Verification

After starting workers, check status:

```bash
npx tsx scripts/check-import-status.ts
```

You should see:

- Jobs moving from `PENDING` → `PROCESSING` → `COMPLETED`
- `processedRows` and `successRows` increasing
- Products appearing in the database

## Next Steps

1. **Start workers**: `npm run worker:all` in a separate terminal
2. **Re-upload file** or **process existing jobs** using the manual script
3. **Monitor progress** via the import status page or diagnostic script

## Prevention

For production, consider:

- Running workers as a systemd service (Linux)
- Using PM2 to manage worker processes
- Setting up worker health checks and auto-restart
- Adding monitoring/alerting for worker failures
