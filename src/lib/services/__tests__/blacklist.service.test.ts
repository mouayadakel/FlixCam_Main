/**
 * Unit tests for BlacklistService
 */

import { BlacklistService } from '../blacklist.service'
import { prisma } from '@/lib/db/prisma'
import { EventBus } from '@/lib/events/event-bus'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  },
}))

jest.mock('@/lib/events/event-bus', () => ({
  EventBus: { emit: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock('@/lib/auth/permissions', () => ({
  ...jest.requireActual('@/lib/auth/permissions'),
  hasPermission: jest.fn().mockResolvedValue(true),
}))

const mockFindMany = prisma.user.findMany as jest.Mock
const mockFindFirst = prisma.user.findFirst as jest.Mock
const mockUpdate = prisma.user.update as jest.Mock
const mockHasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock

describe('BlacklistService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHasPermission.mockResolvedValue(true)
  })

  it('lists blacklisted users', async () => {
    mockFindMany.mockResolvedValue([{ id: 'u1', email: 'bad@test.com' }])
    const rows = await BlacklistService.listBlacklisted()
    expect(rows).toHaveLength(1)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isBlacklisted: true, deletedAt: null } })
    )
  })

  it('blacklists a customer', async () => {
    mockFindFirst.mockResolvedValue({ id: 'u1', role: 'CUSTOMER' })
    mockUpdate.mockResolvedValue({})

    await BlacklistService.blacklist('u1', 'Late returns', 'admin-1')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isBlacklisted: true,
          blacklistReason: 'Late returns',
          status: 'LOCKED',
        }),
      })
    )
    expect(EventBus.emit).toHaveBeenCalledWith(
      'client.updated',
      expect.objectContaining({ clientId: 'u1' })
    )
  })

  it('assertNotBlacklisted throws for blocked users', async () => {
    mockFindFirst.mockResolvedValue({ isBlacklisted: true, blacklistReason: 'Fraud' })
    await expect(BlacklistService.assertNotBlacklisted('u1')).rejects.toThrow('Account blocked')
  })

  it('assertNotBlacklisted passes for active users', async () => {
    mockFindFirst.mockResolvedValue({ isBlacklisted: false, blacklistReason: null })
    await expect(BlacklistService.assertNotBlacklisted('u1')).resolves.toBeUndefined()
  })
})
