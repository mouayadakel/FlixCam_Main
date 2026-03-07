/**
 * Integration tests for GET /api/checkout/form-config
 * Public route; mocks prisma; tests 400, 200.
 */

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    checkoutFormSection: {
      findMany: jest.fn(),
    },
  },
}))

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { GET } from '@/app/api/checkout/form-config/route'

const mockFindMany = prisma.checkoutFormSection.findMany as jest.Mock

function createGetRequest(step?: number) {
  const url = step != null ? `http://localhost/api/checkout/form-config?step=${step}` : 'http://localhost/api/checkout/form-config'
  return new NextRequest(url)
}

describe('GET /api/checkout/form-config', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 400 when step is missing', async () => {
    const req = createGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('step')
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('returns 400 when step is invalid (not 1, 2, or 3)', async () => {
    const req = createGetRequest(0)
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when step is 4', async () => {
    const req = createGetRequest(4)
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when step is NaN', async () => {
    const req = new NextRequest('http://localhost/api/checkout/form-config?step=abc')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 with sections for step=1', async () => {
    const sections = [{ id: 's1', step: 1, fields: [] }]
    mockFindMany.mockResolvedValue(sections)
    const req = createGetRequest(1)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.sections).toEqual(sections)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { step: 1, deletedAt: null, isActive: true },
      })
    )
  })

  it('returns 200 with sections for step=2', async () => {
    mockFindMany.mockResolvedValue([])
    const req = createGetRequest(2)
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { step: 2, deletedAt: null, isActive: true },
      })
    )
  })

  it('returns 200 with sections for step=3', async () => {
    mockFindMany.mockResolvedValue([])
    const req = createGetRequest(3)
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { step: 3, deletedAt: null, isActive: true },
      })
    )
  })
})
