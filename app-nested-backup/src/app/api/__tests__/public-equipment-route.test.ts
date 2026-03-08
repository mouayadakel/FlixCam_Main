/**
 * Integration tests for GET /api/public/equipment
 * Public route - no auth required. Mocks prisma, cache, rate-limit.
 */

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    equipment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))
jest.mock('@/lib/cache', () => ({
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
  cacheKeys: {},
}))
jest.mock('@/lib/utils/rate-limit', () => ({
  rateLimitByTier: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { cacheGet, cacheSet } from '@/lib/cache'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { GET } from '@/app/api/public/equipment/route'

const mockFindMany = prisma.equipment.findMany as jest.Mock
const mockCount = prisma.equipment.count as jest.Mock
const mockCacheGet = cacheGet as jest.Mock
const mockCacheSet = cacheSet as jest.Mock
const mockRateLimit = rateLimitByTier as jest.Mock

function createGetRequest(url = 'http://localhost/api/public/equipment') {
  return new NextRequest(url)
}

describe('GET /api/public/equipment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRateLimit.mockReturnValue({ allowed: true })
    mockCacheGet.mockResolvedValue(null)
    mockCacheSet.mockResolvedValue(undefined)
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
  })

  it('returns 200 without auth (public route)', async () => {
    const req = createGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('data')
    expect(data).toHaveProperty('total')
    expect(Array.isArray(data.data)).toBe(true)
  })

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockReturnValue({ allowed: false })
    const req = createGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toBe('Too many requests')
  })

  it('returns cached data when available', async () => {
    const cached = { data: [{ id: 'eq-1' }], total: 1 }
    mockCacheGet.mockResolvedValue(cached)
    const req = createGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual(cached)
    expect(mockFindMany).not.toHaveBeenCalled()
  })
})
