/**
 * Catalog scanner: detects content gaps, builds gap report, and queues backfill jobs.
 * Uses quality-scorer for cached scan and content-health for product IDs with gaps.
 */

import { getCachedScan } from '@/lib/services/quality-scorer.service'
import { addBackfillJob } from '@/lib/queue/backfill.queue'
import type { BackfillOptions, ContentGapReport } from '@/lib/types/backfill.types'

/**
 * Scan only — returns gap report without queuing. Uses Redis cache (5 min TTL) when available.
 */
export async function scanOnly(): Promise<ContentGapReport> {
  const scan = await getCachedScan()
  return {
    scannedAt: scan.scannedAt,
    totalProducts: scan.totalProducts,
    totalEquipment: 0,
    byGapType: {
      missingTranslations: scan.byGapType.missingTranslations,
      missingSeo: scan.byGapType.missingSeo,
      missingDescription: scan.byGapType.missingDescription,
      missingPhotos: scan.byGapType.missingPhotos,
      missingSpecs: scan.byGapType.missingSpecs,
    },
    catalogQualityScore: scan.catalogQualityScore,
    products: scan.products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      contentScore: p.contentScore,
      gaps: p.gaps,
      imageCount: p.imageCount,
      lastAiRunAt: p.lastAiRunAt,
    })),
  }
}

/**
 * Main entry: scan catalog for gaps and queue backfill jobs. Returns job ID and report.
 */
export async function scanAndQueue(options: BackfillOptions): Promise<{
  jobId: string
  report: ContentGapReport
}> {
  const report = await scanOnly()
  let productIds = options.productIds ?? report.products.map((p) => p.id)

  if (options.minQualityScore != null) {
    productIds = report.products
      .filter((p) => p.contentScore < options.minQualityScore!)
      .map((p) => p.id)
  }
  if (options.maxProducts != null && productIds.length > options.maxProducts) {
    productIds = productIds.slice(0, options.maxProducts)
  }

  if (options.dryRun) {
    return {
      jobId: '',
      report,
    }
  }

  const result = await addBackfillJob(productIds, {
    types: options.types,
    trigger: options.trigger ?? 'scan',
    triggeredBy: options.triggeredBy,
    previewMode: options.previewMode,
  })
  return { jobId: result.jobId, report }
}

/**
 * Queue a single product for backfill (e.g. from event or "Backfill now" button).
 */
export async function queueSingleProduct(
  productId: string,
  types: Array<'text' | 'photo' | 'spec'>,
  trigger: 'manual' | 'event',
  options?: { triggeredBy?: string }
): Promise<string> {
  const result = await addBackfillJob([productId], {
    types,
    trigger: trigger === 'event' ? 'event' : 'single',
    triggeredBy: options?.triggeredBy,
  })
  return result.jobId
}
