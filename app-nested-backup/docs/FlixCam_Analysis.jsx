import { useState } from 'react'

const data = {
  categories: [
    {
      id: 'security',
      label: 'Security & Data Integrity',
      icon: '🔐',
      color: '#dc2626',
      bg: '#fef2f2',
      border: '#fecaca',
      score: 2,
      weaknesses: [
        {
          title: 'SSRF Bypass in Image Processing',
          severity: 'CRITICAL',
          file: 'image-processing.service.ts:87',
          problem:
            "The URL allowlist has an 'else return true' fallback that accepts ANY public domain — the entire SSRF protection is effectively disabled.",
          impact:
            'Attackers can use your server as a proxy to make requests to internal infrastructure, cloud metadata endpoints (AWS 169.254.x.x), or any external server.',
          fix: "Remove the else branch entirely. If a domain isn't on the allowlist, reject it. Period. The allowlist should be the only path to true.",
          effort: '30 min',
          priority: 'P0',
        },
        {
          title: 'API Key Exposed in URL Query String',
          severity: 'CRITICAL',
          file: 'test-connection/route.ts:69',
          problem:
            'Gemini API key is passed as a URL query param (?key=...). URLs are logged by every proxy, CDN, load balancer, browser history, and server access log in the chain.',
          impact:
            'Your API key is effectively public to anyone with server log access. A compromised log file = compromised AI budget.',
          fix: 'Move the key to an Authorization header or request body. Never put secrets in URLs.',
          effort: '30 min',
          priority: 'P0',
        },
        {
          title: 'Race Condition on Duplicate Job Creation',
          severity: 'CRITICAL',
          file: 'backfill/route.ts:45–54',
          problem:
            'The duplicate-job guard uses findFirst then create in two separate operations. Two concurrent POST requests can both pass the findFirst check before either creates the job.',
          impact:
            'Double backfill jobs = double OpenAI/Gemini API spend. On a 1000-product catalog, this could mean $50–200 in wasted API calls per accidental double-click.',
          fix: 'Use Prisma $transaction with a unique constraint or an atomic upsert. The guard must be a single database operation.',
          effort: '1 hour',
          priority: 'P0',
        },
        {
          title: 'Stack Traces Exposed in API Response',
          severity: 'HIGH',
          file: 'backfill/route.ts:158',
          problem:
            'The full errorLog array — including internal error messages and stack traces — is returned in the job status API response.',
          impact:
            'Attackers can probe your internal architecture: database schema names, file paths, library versions, service names. Classic information disclosure.',
          fix: 'Sanitize errorLog before sending. Return only: rowIndex, errorType (enum), and a human-readable message. Never send the raw Error.stack.',
          effort: '45 min',
          priority: 'P1',
        },
        {
          title: 'No Rate Limiting on Any AI Route',
          severity: 'HIGH',
          file: 'All /api/admin/ai/* routes',
          problem:
            'Any admin with ai.use permission can trigger unlimited backfill jobs, call the bulk-analyze endpoint repeatedly, or hammer the test-connection endpoint with no throttling.',
          impact:
            'A single malicious or careless admin can drain your entire monthly AI budget in minutes. No protection against credential-stuffed accounts either.',
          fix: 'Add Upstash rate limiting per user + per route. Suggested: 3 backfill triggers/hour/user, 10 test-connection calls/hour/user. Alert at 80% daily budget.',
          effort: '2 hours',
          priority: 'P1',
        },
        {
          title: 'Timing Attack on Cron Secret',
          severity: 'MEDIUM',
          file: 'cron/backfill/route.ts:22',
          problem:
            'CRON_SECRET is compared with a simple string equality (===). JavaScript string comparison short-circuits at the first different character.',
          impact:
            'A timing attack can reveal the secret one character at a time by measuring response time differences. Unlikely but real for a scheduled production endpoint.',
          fix: "Use crypto.timingSafeEqual() from Node's built-in crypto module. Two lines of code.",
          effort: '15 min',
          priority: 'P2',
        },
      ],
      recommendations: [
        'Implement a unified SecurityMiddleware that applies to all AI routes: auth check → permission check → rate limit check → input validation. One place, one source of truth.',
        'Add a dedicated AI budget enforcement check inside the backfill worker itself — not just an upfront estimate. If budget is exhausted mid-job, stop gracefully and mark remaining items as skipped.',
        'Rotate all API keys immediately. Audit server logs for any existing key exposure from the URL query param issue.',
        'Add Cloudinary allowlist validation: only accept downloads from a predefined list of trusted domains (your suppliers, manufacturers, stock sites).',
      ],
    },
    {
      id: 'architecture',
      label: 'Architecture & Data Model',
      icon: '🏗️',
      color: '#7c3aed',
      bg: '#faf5ff',
      border: '#e9d5ff',
      score: 3,
      weaknesses: [
        {
          title: 'Product vs Equipment Model Mismatch — The Core Problem',
          severity: 'CRITICAL',
          file: 'System-wide',
          problem:
            "The AI Dashboard reads from the Product model. Equipment pages read from the Equipment model. Backfill writes to Product. This means: the dashboard shows '95% content complete' while the actual equipment detail page on your public website shows empty descriptions.",
          impact:
            'Admins think content is filled. Customers see blank pages. SEO suffers on the actual equipment URLs. Quality scores are completely meaningless.',
          fix: 'Decision needed: either (A) make backfill write to Equipment + Equipment translations, or (B) make Equipment pages read from Product as the content source. Option A is cleaner. Must be resolved before any AI content work has real value.',
          effort: '3–5 days',
          priority: 'P0',
        },
        {
          title: 'Dead Letter Queue — Built but Completely Disconnected',
          severity: 'HIGH',
          file: 'dead-letter.queue.ts + backfill.worker.ts',
          problem:
            'A dead letter queue was built (46 LOC) but no worker ever sends failed jobs to it. When a product fails to backfill permanently, the error is logged and the job moves on. The failed item is silently dropped.',
          impact:
            "You have no way to know which products permanently failed. They're not in a retry queue, not in a UI list, not alerting anyone. Content gaps quietly persist forever.",
          fix: 'Wire the dead-letter queue in backfill.worker.ts catch block. Build a Dead Letter UI tab in the dashboard: list of permanently failed items, reason, retry button, and dismiss button.',
          effort: '1.5 hours wiring + 1 day UI',
          priority: 'P1',
        },
        {
          title: 'Duplicate Job Creation Logic',
          severity: 'HIGH',
          file: 'catalog-scanner.service.ts + backfill.queue.ts',
          problem:
            "Two separate functions — queueBackfillJob and addBackfillJob — both create jobs. They have different logic, different data shapes, and different behaviors. Developers don't know which one to call.",
          impact:
            "Bugs introduced in one function don't get fixed in the other. Inconsistent AiJob records. New developers call the wrong one.",
          fix: 'Delete one. Pick addBackfillJob as the canonical entry point. Make catalog-scanner.service call it. Single path, single behavior.',
          effort: '1 hour',
          priority: 'P1',
        },
        {
          title: 'No Equipment Slug — URLs are Not Human-Readable',
          severity: 'HIGH',
          file: 'Equipment model',
          problem:
            'Equipment detail URLs look like /equipment/clxyz123abc (a Prisma cuid). The route is named [slug] but actually receives the ID.',
          impact:
            "Zero SEO value from URLs. Users can't share meaningful links. Links break if you ever need to change IDs. Copy-pasting URLs is confusing.",
          fix: 'Add a slug field to the Equipment model. Auto-generate from name on creation (kebab-case, unique). Add a unique index. Update the route to look up by slug, fall back to ID for backward compatibility.',
          effort: '1 day',
          priority: 'P1',
        },
        {
          title: 'In-Memory Loading of Entire Product Catalog',
          severity: 'HIGH',
          file: 'content-health.service.ts:239–281',
          problem:
            'getProductIdsWithGaps() loads ALL products into memory to find which ones have gaps. On a catalog of 1000+ items, this is a 100MB+ memory spike per request.',
          impact:
            'OOM crashes on large catalogs. Slow response times. Every backfill trigger call pays this cost.',
          fix: 'Rewrite with cursor-based pagination. Process 100 products at a time, stream IDs into the queue. Never load everything into memory at once.',
          effort: '2 hours',
          priority: 'P0',
        },
        {
          title: 'N+1 Query Problem in Quality Scoring',
          severity: 'HIGH',
          file: 'quality-scorer.service.ts:265–296',
          problem:
            "runFullScan() fetches all products, then calls scoreProduct() per product. Each scoreProduct() call does its own findUnique database query. For 500 products, that's 501 database queries instead of 1.",
          impact:
            'Quality scan takes minutes instead of seconds. Database connection pool exhausted. Other users experience slowdowns during scans.',
          fix: 'Fetch all products with their translations and images in a single query using Prisma includes. Compute scores in memory from the already-loaded data.',
          effort: '2 hours',
          priority: 'P0',
        },
        {
          title: 'File Buffers Stored in Redis via Import Queue',
          severity: 'MEDIUM',
          file: 'import.queue.ts:44',
          problem:
            "Excel file buffers (potentially 50MB) are being stored as job data in Redis. Redis is an in-memory store — it's not designed for binary file storage.",
          impact:
            'Redis memory pressure, potential OOM on Redis. Performance degradation for all other queue operations. Redis eviction policies may silently drop large jobs.',
          fix: 'Upload the file to S3/Cloudinary on receipt. Store only the file URL/reference in the Redis job. The worker downloads the file from storage, processes it, deletes it.',
          effort: '1 day',
          priority: 'P1',
        },
      ],
      recommendations: [
        'Resolve the Product/Equipment split first — before any other AI work. Everything built on top of the wrong model is wasted effort.',
        'Introduce an event-driven pattern: when backfill completes for an item, fire an EquipmentContentUpdated event. Let Equipment pages subscribe to sync. This decouples the models without a full merge.',
        'Add a slug field to Equipment immediately — every day without slugs is SEO value lost.',
        'Consider a content staging layer: AI output goes into a ContentDraft table, never directly to live. Approve → copy to Equipment. This also solves the preview gap.',
      ],
    },
    {
      id: 'ai_workflow',
      label: 'AI Workflow & Auto-Fill',
      icon: '🤖',
      color: '#0369a1',
      bg: '#f0f9ff',
      border: '#bae6fd',
      score: 3,
      weaknesses: [
        {
          title: 'AI Writes Directly to Live Data — No Preview',
          severity: 'CRITICAL',
          file: 'backfill.worker.ts',
          problem:
            "When you click 'Fill All', the AI generates descriptions, SEO, and specs, and writes them directly to the live database with zero human review. Only images get a pendingReview flag. Text goes straight to production.",
          impact:
            'Hallucinated specs (wrong sensor size, wrong weight, wrong compatibility) go live immediately. Bad Arabic translations go live. Wrong SEO titles go live. Your customers see AI mistakes before you do.',
          fix: "Implement the proposed AiContentDraft staging table. All AI output goes to Draft first. Add a 'Pending Review' tab in the dashboard for text/specs. One-click Approve or Edit → Approve before anything goes live.",
          effort: '3 days',
          priority: 'P0',
        },
        {
          title: 'Arabic and Chinese Get English SEO Fields',
          severity: 'CRITICAL',
          file: 'backfill.worker.ts:189–219',
          problem:
            'When the worker upserts translations for Arabic and Chinese, it copies the English SEO metadata (seo.metaTitle, seo.metaDescription) into the AR and ZH translation records without translating it.',
          impact:
            "Arabic pages have English meta titles. Search engines see Arabic content with English metadata — a massive multilingual SEO contradiction. Arabic users searching in Arabic won't find your equipment.",
          fix: "Generate locale-specific SEO in each translation call. Pass the locale to the AI prompt: 'Generate Arabic SEO title for [equipment name]'. Three separate AI calls, three locale-correct outputs.",
          effort: '2 hours',
          priority: 'P0',
        },
        {
          title: '8 of 11 AI Methods Are Just Math, Not AI',
          severity: 'HIGH',
          file: 'ai.service.ts',
          problem:
            "Risk assessment, deposit suggestion, alternative recommendations, pricing, demand forecast — all labeled 'AI features' but are hardcoded formulas: 90-day average + 10% growth, utilization ± 10%, weighted sum of 5 factors. Seasonality is hardcoded as 1.0.",
          impact:
            "Users think they're getting intelligent recommendations. They're getting arithmetic. The 'AI Features' sidebar section is misleading. When it gets things wrong, it damages trust in the real AI features too.",
          fix: "Either (A) rename these to 'Smart Suggestions' or 'Automated Analysis' to be honest about what they are, or (B) actually integrate LLM calls. At minimum, fix the demand forecast to use real seasonality data from your own booking history.",
          effort: 'A: 2 hours (rename) | B: 2 weeks (real AI)',
          priority: 'P1',
        },
        {
          title: 'No Confidence Score Shown to Users',
          severity: 'HIGH',
          file: 'AI Dashboard — all tabs',
          problem:
            'The spec inference service generates confidence scores per field internally. But this confidence data is never shown to the admin in any UI. All AI output looks equally authoritative.',
          impact:
            "Admins don't know which fields to trust and which to verify. A spec inferred with 60% confidence looks identical to one inferred with 99% confidence. Human review is unfocused.",
          fix: 'Expose confidence scores in the Preview panel. Color-code: green (≥90%), yellow (70–90%), red (<70%). Red fields should require explicit confirmation before they can be approved.',
          effort: '1 day UI + already in backend',
          priority: 'P1',
        },
        {
          title: '12+ Silent Error Swallows in AI Service',
          severity: 'HIGH',
          file: 'ai.service.ts — 12+ catch blocks',
          problem:
            'Across the AI service, errors from LLM calls are caught and silently discarded with empty catch {} blocks. If OpenAI times out, returns an error, or returns malformed JSON, nothing is logged.',
          impact:
            "Production debugging is impossible. You don't know if specs are being inferred or silently failing. Cost tracking is inaccurate if failed calls aren't logged. SLA monitoring is blind.",
          fix: 'Replace every catch {} with: log the error (structured JSON log with productId, operation, provider, errorCode, duration), increment error metrics, and either retry with exponential backoff or send to dead letter queue.',
          effort: '2 hours',
          priority: 'P1',
        },
        {
          title: 'No Context Awareness in AI Prompts',
          severity: 'MEDIUM',
          file: 'ai-autofill.service.ts, ai-spec-parser.service.ts',
          problem:
            "AI prompts are generic fill-in-the-blank templates. They don't include: similar products in the same category, the brand's typical spec patterns, the target market (Saudi B2B cinema rental), or regional context.",
          impact:
            'AI generates generic descriptions that could apply to any rental platform globally. Missing the specific tone, terminology, and trust signals that Saudi B2B cinema professionals expect.',
          fix: "Enrich prompts with context: inject the top 3 most-rented products in the same category as examples, include brand description, specify audience ('professional cinematographers in Saudi Arabia'), include pricing tier context.",
          effort: '1 day',
          priority: 'P2',
        },
      ],
      recommendations: [
        'The single most important AI improvement: staging table. Never write AI output directly to live. This one change makes the entire AI system trustworthy instead of risky.',
        "Build a 'Confidence Heatmap' view: a grid where each equipment item shows which fields are high/low confidence. Admins can sort by lowest-confidence fields to prioritize review.",
        "Add an 'AI Suggest' button directly on the equipment edit form — not just in the bulk dashboard. Single-item AI suggestions with immediate preview should be the primary workflow.",
        'Implement AI feedback loop: when an admin edits an AI-generated field before approving, log the original vs. edited value. After 50 such edits, analyze patterns to improve prompts.',
        "Add a 'Regenerate' button per field in the preview panel — let admins ask AI to try again with different phrasing without regenerating everything.",
        'Track AI accuracy over time: compare AI-generated specs against manufacturer specs when equipment is updated manually. Surface accuracy metrics in the analytics tab.',
      ],
    },
    {
      id: 'import',
      label: 'Excel Import Workflow',
      icon: '📊',
      color: '#065f46',
      bg: '#f0fdf4',
      border: '#a7f3d0',
      score: 4,
      weaknesses: [
        {
          title: 'Workers Must Be Manually Started — Will Be Forgotten',
          severity: 'CRITICAL',
          file: 'System operational gap',
          problem:
            'The entire import system depends on npm run worker:all being running in a separate terminal. If the server restarts, deploys, or crashes, workers stop. Jobs queue up silently. Nothing processes. No alert fires.',
          impact:
            "Every deployment kills the workers. Every server restart kills the workers. Admins upload files, see the job 'created', wait for progress that never comes. Support tickets flood in.",
          fix: 'Run workers as a managed process: PM2 ecosystem.config.js with watch, restart-on-crash, and log rotation. Add a worker health check endpoint: GET /api/admin/system/workers/health → returns worker status. Alert in the admin dashboard header if workers are down.',
          effort: '4 hours setup + 1 hour dashboard indicator',
          priority: 'P0',
        },
        {
          title: 'Multi-Sheet Mapping is One-at-a-Time',
          severity: 'HIGH',
          file: 'Import UI — accordion component',
          problem:
            "The user story explicitly requires mapping all sheets simultaneously before import. The current UI shows an accordion where you expand one sheet, map it, collapse it, expand the next. You can't see all your mappings at once.",
          impact:
            'On a file with 20 sheets (common in equipment catalogs), the admin must perform 20 sequential expand-map-collapse operations. No overview. Easy to miss a sheet. No way to confirm all mappings before starting.',
          fix: "Replace the accordion with a mapping table: each row is a sheet, columns are Sheet Name | Row Count | Category | Subcategory | Status. All visible at once. Click anywhere in a row to change the mapping. 'Start Import' button only activates when all rows have a category.",
          effort: '2 days',
          priority: 'P1',
        },
        {
          title: 'AI Preview Dialog is Still Pending',
          severity: 'HIGH',
          file: 'BULK_IMPORT_IMPLEMENTATION_STATUS.md — pending items',
          problem:
            "The 'Preview AI' button exists in the import flow. The AIPreviewDialog component is listed as pending. Users click the button and presumably see nothing or an error.",
          impact:
            "The most important user-facing AI feature in the import flow is not working. The entire 'Preview + Edit (AI)' import mode is broken.",
          fix: "Build the AIPreviewDialog: call /api/admin/imports/preview-ai, display the returned suggestions in a side-by-side table (Original | AI Suggestion | Editable field), let admin edit inline, click 'Apply All' or 'Apply Selected' before import starts.",
          effort: '3 days',
          priority: 'P0',
        },
        {
          title: 'No Row-Level Selection in Import UI',
          severity: 'MEDIUM',
          file: 'Import UI',
          problem:
            'You can select which sheets to import, but not which rows within a sheet. If a sheet has 200 rows and you only want 50, you must import all 200 and then manually delete the unwanted 150.',
          impact:
            "Wasted products in the database. Admin overhead. AI and image processing runs on rows you didn't want. Can't do a partial test import.",
          fix: "Add a row preview table with checkboxes per row. Default to all selected. 'Select by filter' lets you select rows where Brand = 'Sony' or Price > 0. 'Import selected rows only' sends only checked rows.",
          effort: '2 days',
          priority: 'P2',
        },
        {
          title: 'No Import Templates — Every Upload Starts from Scratch',
          severity: 'MEDIUM',
          file: 'Import system',
          problem:
            'If an admin imports from the same supplier every week, they must re-map every column and category every single time. There is no way to save a mapping configuration.',
          impact:
            '10 minutes of manual mapping per import × 4 imports/month × 12 months = 8 hours/year wasted on mechanical remapping. High error risk on every re-mapping.',
          fix: "After a successful import, offer 'Save this mapping as a template'. On next upload, if the sheet names and column names match a saved template, auto-apply it. Show a 'Template applied' notification with 'Review' option.",
          effort: '2 days',
          priority: 'P2',
        },
        {
          title: 'No Incremental Update Mode — Reimport = Duplicate',
          severity: 'MEDIUM',
          file: 'import-worker.ts',
          problem:
            "The import system only creates new products. If you reimport a file with updated prices or descriptions, you get duplicate products. There is no 'update if SKU exists' mode.",
          impact:
            'Price updates require manual editing of each product. Catalog management at scale is impossible. Common use case (weekly price sheet from supplier) is completely unsupported.',
          fix: "Add import mode selector: 'Create only' (current), 'Update only (skip new)', 'Create and update'. For update mode: match by SKU, update specified columns only, log what changed, skip unchanged rows.",
          effort: '3 days',
          priority: 'P2',
        },
      ],
      recommendations: [
        'Add a worker health indicator to the admin sidebar — a green/red dot that shows if workers are running. Clicking it opens a system status panel with queue depths and last processed time.',
        "Build an Import History page: every past import with status, row counts, errors, date, user who triggered it, and a 'Reuse Settings' button that reopens the import wizard pre-configured.",
        "Add a 'Test with 10 rows' option: run the import on just the first 10 rows, check the results, then decide whether to continue with the full file. Reduces risk on large imports.",
        'Send an email/notification to the importing admin when their job completes, including a summary: X created, Y updated, Z failed — with a link to the error report.',
        "Add column auto-detection with fuzzy matching: if the file has 'Marka' instead of 'Brand', suggest it as a match with 85% confidence. Let admin confirm or reassign.",
        'Build a supplier profile system: save supplier-specific settings (their column names, category defaults, price multipliers, translation preferences) so bulk importing from the same source is one-click.',
      ],
    },
    {
      id: 'rbac_audit',
      label: 'Permissions & Audit Trail',
      icon: '🛡️',
      color: '#92400e',
      bg: '#fffbeb',
      border: '#fde68a',
      score: 2,
      weaknesses: [
        {
          title: 'Single Permission Gates Everything AI',
          severity: 'CRITICAL',
          file: 'permissions.ts — PERMISSIONS.AI_USE',
          problem:
            'One permission (ai.use) controls: viewing the AI dashboard, seeing quality scores, reviewing images, AND triggering expensive batch backfill jobs that can cost $50–200 per run.',
          impact:
            "A content reviewer who just needs to approve images has the same power to trigger a full catalog backfill as the CTO. There's no way to give read-only AI dashboard access without also giving 'spend budget' access.",
          fix: 'Split into 4 granular permissions: ai.view (see dashboard, scores, analytics), ai.run (trigger backfill jobs), ai.review (approve/reject images and content), ai.configure (API keys, budgets, settings). Assign them separately in role definitions.',
          effort: '3 hours',
          priority: 'P1',
        },
        {
          title: 'Zero Audit Trail for AI Operations',
          severity: 'HIGH',
          file: 'All AI API routes',
          problem:
            'There is no record of who triggered a backfill, who approved which image, who changed AI settings, or what the AI output was before it was approved. All AI actions are untracked.',
          impact:
            "If a bad image goes live, you can't trace who approved it. If the AI budget gets drained, you can't see who triggered what. Compliance audits fail. Disputes can't be resolved.",
          fix: 'Add an AuditLog entry for every AI operation: actor (userId), action (enum: BACKFILL_TRIGGERED, IMAGE_APPROVED, IMAGE_REJECTED, SETTINGS_CHANGED, CONTENT_APPROVED), target (productId, jobId), metadata (JSON), timestamp. Build an Audit Log tab in the AI dashboard.',
          effort: '1 day logging + 1 day UI',
          priority: 'P1',
        },
        {
          title: 'No Approval Workflow for Large Backfill Jobs',
          severity: 'MEDIUM',
          file: 'backfill/route.ts',
          problem:
            "Any admin with ai.run permission can trigger 'Fill All' — which queues 1000+ products for AI processing — with a single confirmation dialog. There is no second approver, no budget estimate enforcement, no manager notification.",
          impact:
            'A junior admin clicks the wrong button. $150 in AI API costs. No way to stop it mid-run easily. No notification sent to their manager.',
          fix: 'For jobs above a threshold (e.g., 100 products or estimated $20 cost), require a second approval: send a notification to users with ai.configure permission who must approve within 10 minutes, otherwise the job waits.',
          effort: '2 days',
          priority: 'P2',
        },
      ],
      recommendations: [
        "Implement the 4-permission split immediately — it's the minimum viable RBAC for an AI system that costs real money per operation.",
        "Add a 'Cost Estimate' step before any backfill confirmation: 'This will process 847 products. Estimated cost: $12.40. Current monthly spend: $43.20 / $100 budget.' Make it impossible to miss.",
        'Build a real-time budget gauge in the admin header: a progress bar showing daily and monthly AI spend vs. limits. Turn orange at 70%, red at 90%, and disable backfill at 95% as a safety buffer.',
        'Add AI operation notifications: when a large backfill completes, when budget exceeds 80%, when an image is rejected, send to the responsible admin via the notification system.',
        'Store every AI suggestion alongside the final approved value in AiContentDraft. This creates a dataset you can use to fine-tune prompts and measure AI accuracy over time.',
      ],
    },
    {
      id: 'ux',
      label: 'Admin UX & Dashboard Quality',
      icon: '🎨',
      color: '#be185d',
      bg: '#fdf2f8',
      border: '#fbcfe8',
      score: 3,
      weaknesses: [
        {
          title: 'Dashboard Shows Meaningless Quality Scores',
          severity: 'HIGH',
          file: 'AI Dashboard — Overview tab',
          problem:
            'The quality score reads from Product translations. The equipment pages read from Equipment model. A product can show 95% quality score in the dashboard while the actual public equipment page shows zero content.',
          impact:
            "The entire quality dashboard is providing false confidence. Admins think they're done. They're not. This is the most demoralizing discovery when they check the public website.",
          fix: "Fix the Product/Equipment alignment first (see Architecture section). Then the quality scores will reflect reality. Consider adding a 'Verify' button that checks the actual equipment detail page content.",
          effort: 'Depends on architecture fix',
          priority: 'P0',
        },
        {
          title: 'Analytics KPIs Show Only Current Page of 30 Jobs',
          severity: 'HIGH',
          file: 'analytics-tab.tsx',
          problem:
            'The KPI cards (Total Jobs, Total Cost, Average Duration) are computed from the 30 jobs currently visible on the page, not from the full job history. Page 2 shows completely different KPI numbers.',
          impact:
            "If you have 200 jobs and are on page 3, your 'Total Cost' card shows the cost of jobs 61–90 only. Every number in the analytics overview is wrong.",
          fix: 'Run a separate aggregate query for KPIs: SELECT COUNT(*), SUM(costUsd), AVG(duration) FROM AiJob. Return alongside the paginated list. KPIs are always the full dataset; table is paginated.',
          effort: '2 hours',
          priority: 'P1',
        },
        {
          title: "'Scan All' Button Does the Same Thing as 'Refresh'",
          severity: 'MEDIUM',
          file: 'overview-tab.tsx — handleScanAll',
          problem:
            "The 'Scan All' button calls handleRefresh() — literally the same function. It's a confusing second button that does nothing different.",
          impact:
            "User clicks 'Scan All' expecting a deep catalog scan. They get a page refresh. Confusion. Loss of trust in the UI.",
          fix: "Either (A) make 'Scan All' actually trigger a full quality scan API call and show a loading indicator until complete, or (B) remove the button entirely. Never have two buttons that do the same thing.",
          effort: '30 min',
          priority: 'P2',
        },
        {
          title: 'Image Review Filter Breaks After Filtering',
          severity: 'MEDIUM',
          file: 'image-review-tab.tsx',
          problem:
            "The product filter dropdown is populated from the currently visible images. When you filter to 'Product A', the dropdown now only shows 'Product A' — you can't switch to 'All' or 'Product B' because they're not in the list anymore.",
          impact:
            "Once you filter the image review, you're stuck. You have to refresh the page to see other products. This is a fundamental UX trap.",
          fix: 'Fetch the product list for the filter dropdown independently from the filtered image list. Two separate API calls: one for filter options (always all products with pending images), one for the filtered image grid.',
          effort: '1 hour',
          priority: 'P1',
        },
        {
          title: 'No Mobile Responsiveness on AI Dashboard',
          severity: 'MEDIUM',
          file: 'All 4 AI dashboard tabs',
          problem:
            'The AI dashboard tables, charts, and grids are built for wide desktop screens. No responsive breakpoints exist for tablet or mobile use.',
          impact:
            "Admins reviewing from a tablet during a shoot can't use the dashboard. The image review workflow (approve/reject) is particularly painful on touch screens.",
          fix: 'Add Tailwind responsive classes to all tabs. For mobile: stack the KPI cards vertically, make the product table horizontally scrollable, make the image grid 2-column, use touch-friendly 44px minimum tap targets for approve/reject.',
          effort: '2 days',
          priority: 'P2',
        },
        {
          title: 'All AI Feature Tabs Are in English Only',
          severity: 'HIGH',
          file: '/admin/ai (5 tabs: Risk, Kit, Pricing, Demand, Chatbot)',
          problem:
            'The main AI Features page and all its tabs are entirely in English. Every other page in the admin panel is in Arabic. The chatbot is in English. The risk assessment form is in English.',
          impact:
            'Arabic-speaking admins are alienated from the most sophisticated features of the platform. The AI section feels like an unfinished bolt-on rather than an integrated part of the product.',
          fix: "Translate all 5 tabs to Arabic. Use the existing i18n infrastructure. Prioritize the chatbot — it's the most conversational and the most jarring to have in English in an Arabic admin panel.",
          effort: '1 day per tab × 5 tabs',
          priority: 'P1',
        },
      ],
      recommendations: [
        "Redesign the image review workflow for efficiency: keyboard shortcuts are good but add a 'Review session' mode that shows one image at a time full-screen with A/R keyboard shortcuts and a counter ('12 of 47 reviewed').",
        "Add a 'Content Status' column to the equipment list page so admins can see at a glance which items have complete content, which have AI-draft content pending review, and which are empty — without opening the AI dashboard.",
        "Build a 'Daily Digest' email: every morning, email admins with: X new images pending review, Y products with content below 70% quality score, Z failed AI jobs from yesterday.",
        'Add skeleton loading states to all dashboard tabs — not just spinners. Users should see the shape of content loading rather than a blank screen.',
        "Introduce a 'Content Completeness' badge on equipment cards in the admin inventory view: a small colored dot (red/yellow/green) showing content health at a glance.",
      ],
    },
    {
      id: 'public_platform',
      label: 'Public Platform & Equipment Pages',
      icon: '🌐',
      color: '#1d4ed8',
      bg: '#eff6ff',
      border: '#bfdbfe',
      score: 3,
      weaknesses: [
        {
          title: 'No Reviews on Equipment Detail Pages',
          severity: 'HIGH',
          file: 'Equipment detail page',
          problem:
            'The Review model exists in the database. The equipment detail page has no reviews section, no ratings, no star display. All that data is invisible to customers.',
          impact:
            'Social proof is the #1 trust signal in rental decisions. Customers choosing between two similar cameras on your platform have zero peer feedback. Competitor platforms with reviews win.',
          fix: "Build a ReviewsSection component for the equipment detail page. Show average rating (star display), review count, last 5 reviews with customer name (or anonymous), date, and star rating. Add 'Write a Review' CTA for customers who have completed rentals.",
          effort: '3 days',
          priority: 'P1',
        },
        {
          title: 'No Availability Calendar — Customers Booking Blind',
          severity: 'HIGH',
          file: 'Equipment detail page',
          problem:
            "Equipment pages show no availability information. Customers don't know if the item is available on their dates until they go through the entire checkout process and hit the availability check step.",
          impact:
            "Cart abandonment at checkout. Customer frustration. Lost bookings from customers who don't bother with the full checkout flow just to check availability.",
          fix: "Add a mini availability calendar to the equipment detail page. Show booked dates as gray/unavailable. Customers select their dates directly on the detail page. The 'Add to Cart' button immediately reflects whether those dates are available.",
          effort: '3 days',
          priority: 'P1',
        },
        {
          title: 'Forced Login Before Cart — Kills Conversions',
          severity: 'HIGH',
          file: 'checkout/page.tsx',
          problem:
            'The checkout flow forces login before proceeding. A new potential customer who wants to browse → add to cart → see total → then decide to register is blocked at checkout.',
          impact:
            'Industry data: forced login at checkout increases cart abandonment by 30–40%. B2B customers often want to see total cost before committing to registration.',
          fix: "Allow guest browsing with a persistent cart (localStorage). Show the cart total without login. Require account creation only at the final 'Confirm Booking' step. This is a B2B rental platform — most guests will convert.",
          effort: '3 days',
          priority: 'P1',
        },
        {
          title: 'Missing Pages: About, Contact, Blog',
          severity: 'MEDIUM',
          file: 'Public website',
          problem:
            'The About page is missing. The Contact page is missing (Support page exists but has no form). The Blog/Resources section is missing.',
          impact:
            'About: B2B clients research vendors before committing. No About page = no credibility story. Contact: No form = customers go to WhatsApp only (no lead tracking). Blog: SEO opportunity completely missed.',
          fix: 'Create the three pages. About: company story, team, office location, years in business, certifications. Contact: form (name, company, email, message, interest type) + map + phone + WhatsApp. Blog: 5 articles about cinema equipment care tips, rental guides, equipment comparison.',
          effort: '1 week total',
          priority: 'P2',
        },
        {
          title: 'SEO Metadata Missing on Key Pages',
          severity: 'MEDIUM',
          file: 'Equipment listing, FAQ, Policies pages',
          problem:
            'Multiple pages are missing generateMetadata() — the dynamic metadata function that tells search engines what each page is about. Equipment listing has no dynamic description. Individual equipment pages have no SEO title with the equipment name.',
          impact:
            "Equipment pages show up in Google as just the site title or a random snippet. Missing thousands of long-tail keyword opportunities ('rent Sony FX9 Riyadh', 'Arri Alexa rental Saudi Arabia').",
          fix: "Add generateMetadata() to every public page. Equipment detail: title = '{equipment name} | Rent in Riyadh | FlixCam', description = first 160 chars of equipment description, include Open Graph image for social sharing.",
          effort: '1 day',
          priority: 'P1',
        },
      ],
      recommendations: [
        "Add a 'Notify Me When Available' button on equipment detail pages for out-of-stock items. Capture email, send notification when the item becomes available. Direct revenue opportunity.",
        "Build a 'Frequently Rented Together' section using your booking history data. This is real recommendation data, not fake AI. Massive upsell potential on the equipment detail page.",
        "Add real-time availability badges to equipment cards in the listing page: 'Available Today', 'Booked until [date]', 'Last unit'. Creates urgency, reduces checkout abandonment.",
        "Build a 'Comparison' feature: customers select up to 3 items and see a side-by-side spec comparison table. Critical for B2B decision-makers justifying equipment choices.",
        "Add equipment rental history data to detail pages: 'Rented 47 times' or 'Popular with documentary filmmakers'. Social proof that doesn't require user reviews.",
      ],
    },
  ],
}

const severityConfig = {
  CRITICAL: { color: '#dc2626', bg: '#fee2e2', label: 'CRITICAL' },
  HIGH: { color: '#d97706', bg: '#fef3c7', label: 'HIGH' },
  MEDIUM: { color: '#2563eb', bg: '#dbeafe', label: 'MEDIUM' },
}

const priorityConfig = {
  P0: { color: '#dc2626', label: 'P0 — Blocking' },
  P1: { color: '#d97706', label: 'P1 — Soon' },
  P2: { color: '#059669', label: 'P2 — Sprint' },
}

const scoreLabels = ['', 'Critical', 'Very Weak', 'Needs Work', 'Partial', 'Solid', 'Strong']
const scoreColors = ['', '#dc2626', '#dc2626', '#d97706', '#d97706', '#059669', '#059669']

export default function App() {
  const [activeCategory, setActiveCategory] = useState('security')
  const [expandedWeakness, setExpandedWeakness] = useState(null)
  const [view, setView] = useState('detail') // "detail" | "summary"

  const category = data.categories.find((c) => c.id === activeCategory)
  const totalWeaknesses = data.categories.reduce((s, c) => s + c.weaknesses.length, 0)
  const criticalCount = data.categories.reduce(
    (s, c) => s + c.weaknesses.filter((w) => w.severity === 'CRITICAL').length,
    0
  )
  const p0Count = data.categories.reduce(
    (s, c) => s + c.weaknesses.filter((w) => w.priority === 'P0').length,
    0
  )

  return (
    <div
      style={{
        fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
        background: '#f8fafc',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
          padding: '28px 32px',
          borderBottom: '3px solid #3b82f6',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  color: '#94a3b8',
                  fontSize: 12,
                  letterSpacing: 2,
                  fontWeight: 600,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                FlixCam Platform — Technical Review
              </div>
              <h1
                style={{ color: '#fff', fontSize: 26, fontWeight: 700, margin: 0, lineHeight: 1.2 }}
              >
                Weaknesses, Gaps & Improvement Roadmap
              </h1>
              <p style={{ color: '#93c5fd', fontSize: 14, margin: '8px 0 0', lineHeight: 1.5 }}>
                Based on 83 documentation files across all system layers
              </p>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { n: totalWeaknesses, label: 'Total Issues', color: '#f59e0b' },
                { n: criticalCount, label: 'Critical', color: '#ef4444' },
                { n: p0Count, label: 'P0 Blocking', color: '#f97316' },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    padding: '12px 20px',
                    textAlign: 'center',
                    minWidth: 90,
                  }}
                >
                  <div style={{ color: s.color, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
                    {s.n}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4, fontWeight: 500 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            {[
              ['detail', 'Detailed Analysis'],
              ['summary', 'Summary Overview'],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  border: '1px solid',
                  borderColor: view === v ? '#3b82f6' : 'rgba(255,255,255,0.15)',
                  background: view === v ? '#3b82f6' : 'transparent',
                  color: view === v ? '#fff' : '#94a3b8',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px' }}>
        {view === 'summary' ? (
          // Summary view
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: 20,
                marginBottom: 32,
              }}
            >
              {data.categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id)
                    setView('detail')
                  }}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: 20,
                    border: `1px solid ${cat.border}`,
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)')
                  }
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{cat.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                          {cat.label}
                        </div>
                        <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                          {cat.weaknesses.length} issues found
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        background: cat.bg,
                        border: `1px solid ${cat.border}`,
                        borderRadius: 6,
                        padding: '4px 10px',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          color: scoreColors[cat.score],
                          fontWeight: 800,
                          fontSize: 18,
                          lineHeight: 1,
                        }}
                      >
                        {cat.score}/6
                      </div>
                      <div style={{ color: scoreColors[cat.score], fontSize: 10, fontWeight: 600 }}>
                        {scoreLabels[cat.score]}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => {
                      const count = cat.weaknesses.filter((w) => w.severity === sev).length
                      if (!count) return null
                      const cfg = severityConfig[sev]
                      return (
                        <span
                          key={sev}
                          style={{
                            background: cfg.bg,
                            color: cfg.color,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}
                        >
                          {count} {sev}
                        </span>
                      )
                    })}
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                    <div
                      style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 6 }}
                    >
                      Top issue:
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                      {cat.weaknesses[0]?.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Detail view
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '240px 1fr',
              gap: 24,
              alignItems: 'start',
            }}
          >
            {/* Sidebar nav */}
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                position: 'sticky',
                top: 20,
              }}
            >
              {data.categories.map((cat, i) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id)
                    setExpandedWeakness(null)
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    textAlign: 'left',
                    border: 'none',
                    borderBottom: i < data.categories.length - 1 ? '1px solid #f1f5f9' : 'none',
                    background: activeCategory === cat.id ? cat.bg : 'transparent',
                    borderLeft:
                      activeCategory === cat.id
                        ? `3px solid ${cat.color}`
                        : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>{cat.icon}</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: activeCategory === cat.id ? cat.color : '#374151',
                        lineHeight: 1.3,
                      }}
                    >
                      {cat.label}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {cat.weaknesses.length} issues
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: scoreColors[cat.score] }}>
                      {cat.score}/6
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Main content */}
            <div>
              {/* Category header */}
              <div
                style={{
                  background: category.bg,
                  border: `1px solid ${category.border}`,
                  borderRadius: 12,
                  padding: '20px 24px',
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}
                    >
                      <span style={{ fontSize: 24 }}>{category.icon}</span>
                      <h2
                        style={{ margin: 0, fontSize: 20, fontWeight: 800, color: category.color }}
                      >
                        {category.label}
                      </h2>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => {
                        const count = category.weaknesses.filter((w) => w.severity === sev).length
                        if (!count) return null
                        const cfg = severityConfig[sev]
                        return (
                          <span
                            key={sev}
                            style={{
                              background: cfg.bg,
                              color: cfg.color,
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: 20,
                              border: `1px solid ${cfg.color}30`,
                            }}
                          >
                            {count} {sev}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: 'center',
                      background: '#fff',
                      borderRadius: 10,
                      padding: '12px 20px',
                      border: `1px solid ${category.border}`,
                    }}
                  >
                    <div
                      style={{
                        color: scoreColors[category.score],
                        fontSize: 36,
                        fontWeight: 900,
                        lineHeight: 1,
                      }}
                    >
                      {category.score}
                      <span style={{ fontSize: 18, color: '#94a3b8' }}>/6</span>
                    </div>
                    <div
                      style={{
                        color: scoreColors[category.score],
                        fontSize: 12,
                        fontWeight: 600,
                        marginTop: 2,
                      }}
                    >
                      {scoreLabels[category.score]}
                    </div>
                  </div>
                </div>
              </div>

              {/* Weaknesses */}
              <div style={{ marginBottom: 24 }}>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#374151',
                    margin: '0 0 12px',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Issues Found ({category.weaknesses.length})
                </h3>
                {category.weaknesses.map((w, i) => {
                  const sev = severityConfig[w.severity]
                  const pri = priorityConfig[w.priority]
                  const isOpen = expandedWeakness === `${activeCategory}-${i}`
                  return (
                    <div
                      key={i}
                      style={{
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        marginBottom: 10,
                        overflow: 'hidden',
                        boxShadow: isOpen ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
                        transition: 'box-shadow 0.2s',
                      }}
                    >
                      <button
                        onClick={() =>
                          setExpandedWeakness(isOpen ? null : `${activeCategory}-${i}`)
                        }
                        style={{
                          width: '100%',
                          padding: '16px 20px',
                          textAlign: 'left',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              marginBottom: 6,
                            }}
                          >
                            <span
                              style={{
                                background: sev.bg,
                                color: sev.color,
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 4,
                                letterSpacing: 0.5,
                              }}
                            >
                              {sev.label}
                            </span>
                            <span style={{ color: pri.color, fontSize: 11, fontWeight: 600 }}>
                              {pri.label}
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: 11 }}>⏱ {w.effort}</span>
                          </div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 14,
                              color: '#1e293b',
                              lineHeight: 1.3,
                            }}
                          >
                            {w.title}
                          </div>
                          {w.file && (
                            <div
                              style={{
                                color: '#94a3b8',
                                fontSize: 11,
                                marginTop: 4,
                                fontFamily: 'monospace',
                              }}
                            >
                              📁 {w.file}
                            </div>
                          )}
                        </div>
                        <span
                          style={{ color: '#94a3b8', fontSize: 18, marginLeft: 12, flexShrink: 0 }}
                        >
                          {isOpen ? '▲' : '▼'}
                        </span>
                      </button>

                      {isOpen && (
                        <div style={{ borderTop: '1px solid #f1f5f9', padding: '0 20px 20px' }}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr 1fr',
                              gap: 12,
                              marginTop: 16,
                            }}
                          >
                            {[
                              {
                                label: '🔍 The Problem',
                                text: w.problem,
                                bg: '#fef9f0',
                                border: '#fde68a',
                              },
                              {
                                label: '💥 The Impact',
                                text: w.impact,
                                bg: '#fff5f5',
                                border: '#fecaca',
                              },
                              {
                                label: '✅ The Fix',
                                text: w.fix,
                                bg: '#f0fdf4',
                                border: '#a7f3d0',
                              },
                            ].map((b) => (
                              <div
                                key={b.label}
                                style={{
                                  background: b.bg,
                                  border: `1px solid ${b.border}`,
                                  borderRadius: 8,
                                  padding: '14px 16px',
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: 12,
                                    color: '#374151',
                                    marginBottom: 8,
                                  }}
                                >
                                  {b.label}
                                </div>
                                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                                  {b.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Recommendations */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  padding: '20px 24px',
                }}
              >
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#374151',
                    margin: '0 0 16px',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  💡 Improvement Recommendations
                </h3>
                {category.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '12px 0',
                      borderBottom:
                        i < category.recommendations.length - 1 ? '1px solid #f8fafc' : 'none',
                    }}
                  >
                    <div
                      style={{
                        background: category.color,
                        color: '#fff',
                        borderRadius: '50%',
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 800,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{rec}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer priority matrix */}
        {view === 'summary' && (
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: '24px',
              marginTop: 8,
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#374151',
                margin: '0 0 16px',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              🗺️ Where to Start — Priority Matrix
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                {
                  pri: 'P0',
                  label: 'Fix This Week',
                  color: '#dc2626',
                  bg: '#fef2f2',
                  items: [
                    'SSRF bypass in image processing',
                    'Gemini API key in URL (exposed)',
                    'AI writes directly to live DB (no preview)',
                    'Arabic SEO gets English metadata',
                    'Race condition on job creation',
                    'Workers not auto-managed (will die on deploy)',
                    'AI Preview Dialog is broken/pending',
                    'Product/Equipment model mismatch',
                    'OOM: entire catalog loaded into memory',
                  ],
                },
                {
                  pri: 'P1',
                  label: 'Fix This Month',
                  color: '#d97706',
                  bg: '#fffbeb',
                  items: [
                    'Split ai.use into 4 granular permissions',
                    'Build audit trail for all AI operations',
                    'Fix analytics KPIs (page-scoped, not full dataset)',
                    'Image review filter breaks after filtering',
                    'Dead letter queue built but never wired',
                    '8 of 11 AI methods are mislabeled (not real AI)',
                    '12+ silent error swallows in AI service',
                    'Equipment pages missing reviews',
                    'No availability calendar on detail page',
                    'Translate all AI pages to Arabic',
                    'Add Equipment slug field (SEO)',
                  ],
                },
                {
                  pri: 'P2',
                  label: 'Next Sprint',
                  color: '#059669',
                  bg: '#f0fdf4',
                  items: [
                    'Row-level selection in import UI',
                    'Import templates (save/reuse mappings)',
                    'Incremental update mode (update by SKU)',
                    'Confidence scores visible to admins',
                    'Context-aware AI prompts',
                    'About, Contact, Blog pages',
                    'Mobile responsiveness for AI dashboard',
                    'Multi-sheet mapping table UI',
                    'Approval workflow for large AI jobs',
                    'Budget gauge in admin header',
                  ],
                },
              ].map((col) => (
                <div
                  key={col.pri}
                  style={{
                    background: col.bg,
                    borderRadius: 10,
                    padding: 16,
                    border: `1px solid ${col.color}30`,
                  }}
                >
                  <div
                    style={{ color: col.color, fontWeight: 800, fontSize: 14, marginBottom: 12 }}
                  >
                    {col.pri} — {col.label}
                  </div>
                  {col.items.map((item, i) => (
                    <div
                      key={i}
                      style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}
                    >
                      <span style={{ color: col.color, flexShrink: 0, marginTop: 1 }}>→</span>
                      <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
