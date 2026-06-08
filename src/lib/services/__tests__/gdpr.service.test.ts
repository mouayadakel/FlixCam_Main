/**
 * Unit tests for GdprService
 */

import { GdprService } from '../gdpr.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn(), update: jest.fn() },
  },
}))

const mockFindFirst = prisma.user.findFirst as jest.Mock
const mockUpdate = prisma.user.update as jest.Mock

describe('GdprService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('exportUserData', () => {
    it('returns profile and related records', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'u1',
        email: 'a@test.com',
        name: 'Ali',
        phone: '+966',
        companyName: null,
        billingAddress: null,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        createdAt: new Date('2026-01-01'),
        bookings: [],
        invoices: [],
        reviews: [],
      })

      const result = await GdprService.exportUserData('u1')
      expect(result.profile).toMatchObject({ email: 'a@test.com', name: 'Ali' })
      expect(result.exportedAt).toBeDefined()
    })

    it('throws when user not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(GdprService.exportUserData('missing')).rejects.toThrow('User')
    })
  })

  describe('anonymizeUser', () => {
    it('anonymizes customer account', async () => {
      mockFindFirst.mockResolvedValue({ id: 'u1', role: 'CUSTOMER' })
      mockUpdate.mockResolvedValue({})

      await GdprService.anonymizeUser('u1')

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({
            name: 'Deleted User',
            status: 'LOCKED',
            deletedAt: expect.any(Date),
          }),
        })
      )
    })

    it('rejects non-customer roles', async () => {
      mockFindFirst.mockResolvedValue({ id: 'u1', role: 'ADMIN' })
      await expect(GdprService.anonymizeUser('u1')).rejects.toThrow(
        'Only customer accounts can be self-deleted via portal'
      )
    })
  })
})
