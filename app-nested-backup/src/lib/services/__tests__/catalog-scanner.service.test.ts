/**
 * Unit tests for catalog-scanner.service
 */
import { scanOnly, scanAndQueue, queueSingleProduct } from '../catalog-scanner.service'

jest.mock('@/lib/services/quality-scorer.service', () => ({
  getCachedScan: jest.fn().mockResolvedValue({
    scannedAt: new Date(),
    totalProducts: 5,
    byGapType: {
      missingTranslations: 0,
      missingSeo: 0,
      missingDescription: 0,
      missingPhotos: 0,
      missingSpecs: 0,
    },
    catalogQualityScore: 80,
    products: [],
  }),
}))
jest.mock('@/lib/queue/backfill.queue', () => ({
  addBackfillJob: jest.fn().mockResolvedValue({ jobId: 'job-1' }),
}))

describe('catalog-scanner.service', () => {
  it('scanOnly returns ContentGapReport', async () => {
    const report = await scanOnly()
    expect(report).toHaveProperty('scannedAt')
    expect(report).toHaveProperty('totalProducts')
    expect(report).toHaveProperty('byGapType')
    expect(report).toHaveProperty('catalogQualityScore')
  })

  it('scanAndQueue with dryRun returns empty jobId', async () => {
    const out = await scanAndQueue({ dryRun: true, types: [], trigger: 'manual' })
    expect(out.jobId).toBe('')
    expect(out.report).toBeDefined()
  })

  it('queueSingleProduct calls addBackfillJob', async () => {
    const { addBackfillJob } = require('@/lib/queue/backfill.queue')
    await queueSingleProduct('prod-1', ['text'], 'manual', { triggeredBy: 'user-1' })
    expect(addBackfillJob).toHaveBeenCalledWith(
      ['prod-1'],
      expect.objectContaining({ types: ['text'], trigger: 'single', triggeredBy: 'user-1' })
    )
  })
})
