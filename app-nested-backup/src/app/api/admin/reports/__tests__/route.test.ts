/**
 * Tests for GET /api/admin/reports
 */

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    invoice: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    bookingEquipment: { findMany: jest.fn() },
    equipment: { findMany: jest.fn() },
    user: { count: jest.fn(), findUnique: jest.fn() },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn() },
}))

import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { GET } from '@/app/api/admin/reports/route'

const mockAuth = auth as jest.Mock
const mockHasPermission = hasPermission as jest.Mock

function createRequest(params?: { type?: string; startDate?: string; endDate?: string }) {
  const search = new URLSearchParams()
  if (params?.type) search.set('type', params.type)
  if (params?.startDate) search.set('startDate', params.startDate)
  if (params?.endDate) search.set('endDate', params.endDate)
  return new Request(`http://localhost/api/admin/reports?${search.toString()}`)
}

describe('GET /api/admin/reports', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = createRequest({ type: 'revenue' })
    const res = await GET(req as unknown as NextRequest)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 401 when session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: {} })
    const req = createRequest({ type: 'revenue' })
    const res = await GET(req as unknown as NextRequest)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user lacks permission and is not ADMIN/ACCOUNTANT', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'CUSTOMER' } })
    mockHasPermission.mockResolvedValue(false)
    const req = createRequest({ type: 'revenue' })
    const res = await GET(req as unknown as NextRequest)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toContain('Forbidden')
  })

  it('returns 400 when type is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ADMIN' } })
    const req = createRequest({})
    const res = await GET(req as unknown as NextRequest)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Invalid type')
  })

  it('returns 400 when type is invalid', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ADMIN' } })
    const req = createRequest({ type: 'invalid' })
    const res = await GET(req as unknown as NextRequest)
    expect(res.status).toBe(400)
  })

  it('returns 200 with revenue data when ADMIN and type=revenue', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ADMIN' } })
    const mockAggregate = prisma.invoice.aggregate as jest.Mock
    mockAggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: 1000 } })
      .mockResolvedValue({ _sum: { totalAmount: 0 } })
    ;(prisma.invoice.findMany as jest.Mock).mockResolvedValue([])

    const req = createRequest({ type: 'revenue' })
    const res = await GET(req as unknown as NextRequest)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toBeDefined()
    expect(data.data.totalRevenue).toBe(1000)
  })
})
