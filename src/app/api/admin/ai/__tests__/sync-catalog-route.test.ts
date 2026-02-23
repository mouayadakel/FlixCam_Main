/**
 * Tests for POST /api/admin/ai/sync-catalog
 */

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/auth/permissions', () => ({
  hasAIPermission: jest.fn(),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    equipment: { findMany: jest.fn() },
  },
}))

jest.mock('@/lib/services/product-equipment-sync.service', () => ({
  syncEquipmentToProduct: jest.fn(),
}))

jest.mock('@/lib/queue/redis.client', () => ({
  getRedisClient: jest.fn(() => ({
    del: jest.fn().mockResolvedValue(1),
  })),
}))

import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { syncEquipmentToProduct } from '@/lib/services/product-equipment-sync.service'
import { POST } from '@/app/api/admin/ai/sync-catalog/route'

const mockAuth = auth as jest.Mock
const mockHasAIPermission = hasAIPermission as jest.Mock
const mockFindMany = prisma.equipment.findMany as jest.Mock
const mockSync = syncEquipmentToProduct as jest.Mock

describe('POST /api/admin/ai/sync-catalog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('returns 403 when user lacks AI permission', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as any)
    mockHasAIPermission.mockResolvedValue(false)
    const res = await POST()
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toContain('Forbidden')
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('returns 200 with synced count when no equipment', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as any)
    mockHasAIPermission.mockResolvedValue(true)
    mockFindMany.mockResolvedValue([])
    const res = await POST()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.synced).toBe(0)
    expect(data.total).toBe(0)
    expect(mockSync).not.toHaveBeenCalled()
  })

  it('returns 200 with synced count and calls sync per equipment', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as any)
    mockHasAIPermission.mockResolvedValue(true)
    mockFindMany.mockResolvedValue([{ id: 'eq-1' }, { id: 'eq-2' }])
    mockSync.mockResolvedValue(undefined)
    const res = await POST()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.synced).toBe(2)
    expect(data.total).toBe(2)
    expect(mockSync).toHaveBeenCalledTimes(2)
    expect(mockSync).toHaveBeenCalledWith('eq-1')
    expect(mockSync).toHaveBeenCalledWith('eq-2')
  })

  it('continues on sync error and reports errors in response', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as any)
    mockHasAIPermission.mockResolvedValue(true)
    mockFindMany.mockResolvedValue([{ id: 'eq-1' }, { id: 'eq-2' }])
    mockSync.mockRejectedValueOnce(new Error('No brand')).mockResolvedValueOnce(undefined)
    const res = await POST()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.synced).toBe(1)
    expect(data.total).toBe(2)
    expect(data.errors).toBeDefined()
    expect(Array.isArray(data.errors)).toBe(true)
    expect(data.errors.length).toBeGreaterThanOrEqual(1)
    expect(data.errors[0]).toContain('eq-1')
    expect(data.errors[0]).toContain('No brand')
  })
})
