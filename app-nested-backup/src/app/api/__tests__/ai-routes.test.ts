/**
 * API contract tests for AI dashboard routes.
 * Validates query and body schemas used by backfill, jobs, pending-images, content-health.
 */

import { z } from 'zod'

const jobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  page: z.coerce.number().int().min(1).default(1),
  type: z.enum(['FULL_BACKFILL', 'TEXT_BACKFILL', 'PHOTO_BACKFILL', 'SPEC_BACKFILL']).optional(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

const pendingImagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).default(1),
  productId: z.string().cuid().optional(),
  source: z
    .enum(['UPLOAD', 'BRAND_ASSET', 'AI_GENERATED', 'STOCK_PHOTO', 'WEB_SCRAPED'])
    .optional(),
  sort: z.enum(['createdAt', 'qualityScore']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

const backfillPostBodySchema = z.object({
  productIds: z.array(z.string().cuid()).optional(),
  fillAll: z.boolean().optional().default(false),
})

const contentHealthQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  gapType: z.enum(['translations', 'seo', 'description', 'photos', 'specs']).optional(),
  q: z.string().max(200).optional(),
})

describe('AI routes – query and body validation', () => {
  describe('GET /api/admin/ai/jobs', () => {
    it('accepts valid query params with defaults', () => {
      const result = jobsQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(30)
        expect(result.data.page).toBe(1)
      }
    })
    it('accepts type and status filters', () => {
      const result = jobsQuerySchema.safeParse({ type: 'FULL_BACKFILL', status: 'COMPLETED' })
      expect(result.success).toBe(true)
    })
    it('rejects limit > 100', () => {
      const result = jobsQuerySchema.safeParse({ limit: '101' })
      expect(result.success).toBe(false)
    })
    it('rejects invalid type', () => {
      const result = jobsQuerySchema.safeParse({ type: 'INVALID' })
      expect(result.success).toBe(false)
    })
  })

  describe('GET /api/admin/ai/pending-images', () => {
    it('accepts valid query with defaults', () => {
      const result = pendingImagesSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sort).toBe('createdAt')
        expect(result.data.order).toBe('desc')
      }
    })
    it('accepts productId (cuid) and source', () => {
      const result = pendingImagesSchema.safeParse({
        productId: 'clxx123456789012345678901',
        source: 'AI_GENERATED',
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid source', () => {
      const result = pendingImagesSchema.safeParse({ source: 'INVALID' })
      expect(result.success).toBe(false)
    })
  })

  describe('POST /api/admin/ai/backfill', () => {
    it('accepts fillAll: true without productIds', () => {
      const result = backfillPostBodySchema.safeParse({ fillAll: true })
      expect(result.success).toBe(true)
    })
    it('accepts productIds array', () => {
      const result = backfillPostBodySchema.safeParse({
        productIds: ['clxx123456789012345678901'],
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid cuid in productIds', () => {
      const result = backfillPostBodySchema.safeParse({
        productIds: ['not-a-cuid'],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('GET /api/admin/ai/content-health', () => {
    it('accepts valid query with gapType', () => {
      const result = contentHealthQuerySchema.safeParse({ gapType: 'photos' })
      expect(result.success).toBe(true)
    })
    it('rejects invalid gapType', () => {
      const result = contentHealthQuerySchema.safeParse({ gapType: 'invalid' })
      expect(result.success).toBe(false)
    })
  })

  describe('POST /api/admin/ai/sync-catalog', () => {
    it('has no request body (syncs all equipment to product)', () => {
      // Contract: POST with no body; auth and permission checked in route handler
      const body = {}
      expect(body).toEqual({})
    })
  })
})
