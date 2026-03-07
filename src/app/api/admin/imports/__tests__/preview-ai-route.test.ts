/**
 * Tests for POST /api/admin/imports/preview-ai
 */

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/utils/rate-limit', () => ({
  rateLimitAPI: jest.fn(() => ({ allowed: true })),
}))

jest.mock('@/lib/services/ai-content-generation.service', () => ({
  generateMasterFill: jest.fn(),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    category: { findMany: jest.fn() },
  },
}))

import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { generateMasterFill } from '@/lib/services/ai-content-generation.service'
import { prisma } from '@/lib/db/prisma'
import { POST } from '@/app/api/admin/imports/preview-ai/route'

const mockAuth = auth as jest.Mock
const mockGenerateMasterFill = generateMasterFill as jest.Mock
const mockCategoryFindMany = prisma.category.findMany as jest.Mock

function createRequest(body: unknown) {
  return new Request('http://localhost/api/admin/imports/preview-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/imports/preview-ai', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCategoryFindMany.mockResolvedValue([])
    mockGenerateMasterFill.mockResolvedValue({
      short_desc_en: 'Short desc',
      long_desc_en: 'Long desc',
      seo_title_en: 'SEO Title',
      seo_desc_en: 'SEO Desc',
      seo_keywords_en: 'a, b, c, d, e, f',
      name_ar: 'الاسم',
      name_zh: '名称',
      box_contents: 'Box contents here',
      tags: 'tag1, tag2, tag3, tag4, tag5',
    })
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = createRequest({ rows: [{ name: 'Product 1' }] })
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
    expect(mockGenerateMasterFill).not.toHaveBeenCalled()
  })

  it('returns 400 when rows is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    const req = createRequest({})
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Rows array')
  })

  it('returns 400 when rows is empty array', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    const req = createRequest({ rows: [] })
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(400)
  })

  it('returns 200 with suggestions when valid rows provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    const req = createRequest({
      rows: [{ name: 'Sony FX3', brand: 'Sony', category: 'Cameras' }],
    })
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.suggestions).toBeDefined()
    expect(Array.isArray(data.suggestions)).toBe(true)
    expect(data.suggestions.length).toBe(1)
    expect(data.suggestions[0]).toHaveProperty('aiSuggestions')
    expect(data.suggestions[0]).toHaveProperty('original')
    expect(mockGenerateMasterFill).toHaveBeenCalled()
  })
})
