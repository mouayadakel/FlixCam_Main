/**
 * Vendor service tests
 */
import { VendorService } from '../vendor.service'
import { prisma } from '@/lib/db/prisma'
import { ForbiddenError, ValidationError, NotFoundError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    vendor: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    equipment: { findMany: jest.fn(), count: jest.fn() },
    vendorPayout: { findMany: jest.fn(), aggregate: jest.fn() },
    booking: { findMany: jest.fn() },
    bookingEquipment: { count: jest.fn() },
    $transaction: jest.fn(),
  },
}))
jest.mock('@/lib/auth/permissions', () => ({ hasPermission: jest.fn().mockResolvedValue(true) }))
jest.mock('@/lib/auth/auth-helpers', () => ({ hashPassword: jest.fn().mockResolvedValue('hashed') }))
jest.mock('@/lib/services/audit.service', () => ({ AuditService: { log: jest.fn().mockResolvedValue(undefined) } }))

const hasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock
const mockUserFindFirst = prisma.user.findFirst as jest.Mock
const mockUserUpdate = prisma.user.update as jest.Mock
const mockVendorFindFirst = prisma.vendor.findFirst as jest.Mock
const mockVendorFindMany = prisma.vendor.findMany as jest.Mock
const mockVendorUpdate = prisma.vendor.update as jest.Mock
const mockVendorCount = prisma.vendor.count as jest.Mock
const mockEquipmentFindMany = prisma.equipment.findMany as jest.Mock
const mockEquipmentCount = prisma.equipment.count as jest.Mock
const mockVendorPayoutFindMany = prisma.vendorPayout.findMany as jest.Mock
const mockVendorPayoutAggregate = prisma.vendorPayout.aggregate as jest.Mock
const mockBookingFindMany = prisma.booking.findMany as jest.Mock
const mockBookingEquipmentCount = prisma.bookingEquipment.count as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock

const sampleVendor = {
  id: 'vnd_01',
  userId: 'usr_vendor',
  companyName: 'Acme Corp',
  slug: 'acme-corp',
  status: 'APPROVED',
  isNameVisible: false,
  deletedAt: null,
  user: { id: 'usr_vendor', email: 'v@example.com', name: 'Vendor' },
}

describe('VendorService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    hasPermission.mockResolvedValue(true)
    mockUserFindFirst.mockResolvedValue(null)
    mockVendorFindFirst.mockResolvedValue(null)
    mockVendorFindMany.mockResolvedValue([])
    mockVendorUpdate.mockResolvedValue(sampleVendor)
    mockUserUpdate.mockResolvedValue({})
    mockEquipmentFindMany.mockResolvedValue([])
    mockEquipmentCount.mockResolvedValue(0)
    mockVendorPayoutFindMany.mockResolvedValue([])
    mockVendorPayoutAggregate.mockResolvedValue({ _sum: { netAmount: 0 } })
    mockBookingFindMany.mockResolvedValue([])
    mockBookingEquipmentCount.mockResolvedValue(0)
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: { create: jest.fn().mockResolvedValue({ id: 'usr_01', email: 'vendor@example.com' }) },
        vendor: { create: jest.fn().mockResolvedValue({ id: 'vnd_01', slug: 'acme-corp' }) },
      }
      return fn(tx)
    })
  })

  describe('createVendor', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        VendorService.createVendor(
          { email: 'v@example.com', password: 'pass', companyName: 'Acme' },
          'usr_01'
        )
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws ValidationError when email already exists', async () => {
      mockUserFindFirst.mockResolvedValue({ id: 'existing' })
      await expect(
        VendorService.createVendor(
          { email: 'v@example.com', password: 'pass', companyName: 'Acme' },
          'usr_01'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('creates vendor when input is valid', async () => {
      mockVendorFindFirst.mockResolvedValue(null)
      const result = await VendorService.createVendor(
        { email: 'v@example.com', password: 'pass', companyName: 'Acme' },
        'usr_01'
      )
      expect(result).toBeDefined()
      expect(result.id).toBe('vnd_01')
    })
  })

  describe('approveVendor', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      await expect(VendorService.approveVendor('vnd_01', 'usr_01')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when vendor not found', async () => {
      mockVendorFindFirst.mockResolvedValue(null)
      await expect(VendorService.approveVendor('missing', 'usr_01')).rejects.toThrow(NotFoundError)
    })

    it('approves vendor and returns vendor', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      mockVendorUpdate.mockResolvedValue({ ...sampleVendor, status: 'APPROVED' })
      const result = await VendorService.approveVendor('vnd_01', 'usr_01')
      expect(mockVendorUpdate).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })

  describe('suspendVendor', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      await expect(VendorService.suspendVendor('vnd_01', 'usr_01')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when vendor not found', async () => {
      mockVendorFindFirst.mockResolvedValue(null)
      await expect(VendorService.suspendVendor('missing', 'usr_01')).rejects.toThrow(NotFoundError)
    })

    it('suspends vendor and user', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      await VendorService.suspendVendor('vnd_01', 'usr_01', 'Policy violation')
      expect(mockVendorUpdate).toHaveBeenCalled()
      expect(mockUserUpdate).toHaveBeenCalled()
    })
  })

  describe('reactivateVendor', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      await expect(VendorService.reactivateVendor('vnd_01', 'usr_01')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when vendor not found', async () => {
      mockVendorFindFirst.mockResolvedValue(null)
      await expect(VendorService.reactivateVendor('missing', 'usr_01')).rejects.toThrow(NotFoundError)
    })

    it('reactivates vendor', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      await VendorService.reactivateVendor('vnd_01', 'usr_01')
      expect(mockVendorUpdate).toHaveBeenCalled()
      expect(mockUserUpdate).toHaveBeenCalled()
    })
  })

  describe('getVendorById', () => {
    it('throws NotFoundError when vendor not found', async () => {
      mockVendorFindFirst.mockResolvedValue(null)
      await expect(VendorService.getVendorById('missing', 'usr_01')).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError when non-admin and not own vendor', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      hasPermission.mockResolvedValue(false)
      await expect(VendorService.getVendorById('vnd_01', 'other_user')).rejects.toThrow(ForbiddenError)
    })

    it('returns vendor when admin', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      hasPermission.mockResolvedValue(true)
      const result = await VendorService.getVendorById('vnd_01', 'usr_01')
      expect(result).toMatchObject(sampleVendor)
    })

    it('returns vendor when own vendor', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      hasPermission.mockResolvedValue(false)
      const result = await VendorService.getVendorById('vnd_01', 'usr_vendor')
      expect(result).toMatchObject(sampleVendor)
    })
  })

  describe('getVendorList', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(VendorService.getVendorList({}, 'usr_01')).rejects.toThrow(ForbiddenError)
    })

    it('returns vendor list with total', async () => {
      mockVendorFindMany.mockResolvedValue([sampleVendor])
      mockVendorCount.mockResolvedValue(1)
      const result = await VendorService.getVendorList({}, 'usr_01')
      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('filters by status and search', async () => {
      mockVendorFindMany.mockResolvedValue([])
      mockVendorCount.mockResolvedValue(0)
      await VendorService.getVendorList({ status: 'APPROVED', search: 'Acme', skip: 0, take: 20 }, 'usr_01')
      expect(mockVendorFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'APPROVED',
            OR: expect.any(Array),
          }),
          skip: 0,
          take: 20,
        })
      )
    })
  })

  describe('updateVendor', () => {
    it('throws NotFoundError when vendor not found', async () => {
      mockVendorFindFirst.mockResolvedValue(null)
      await expect(VendorService.updateVendor('missing', { companyName: 'New' }, 'usr_01')).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError when non-admin and not own vendor', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      hasPermission.mockResolvedValue(false)
      await expect(VendorService.updateVendor('vnd_01', { companyName: 'New' }, 'other_user')).rejects.toThrow(ForbiddenError)
    })

    it('updates vendor when admin', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      mockVendorUpdate.mockResolvedValue({ ...sampleVendor, companyName: 'Updated' })
      const result = await VendorService.updateVendor('vnd_01', { companyName: 'Updated' }, 'usr_01')
      expect(mockVendorUpdate).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })

  describe('toggleVisibility', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      await expect(VendorService.toggleVisibility('vnd_01', 'usr_01')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when vendor not found', async () => {
      mockVendorFindFirst.mockResolvedValue(null)
      await expect(VendorService.toggleVisibility('missing', 'usr_01')).rejects.toThrow(NotFoundError)
    })

    it('toggles visibility', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      mockVendorUpdate.mockResolvedValue({ ...sampleVendor, isNameVisible: true })
      const result = await VendorService.toggleVisibility('vnd_01', 'usr_01')
      expect(mockVendorUpdate).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })

  describe('getVendorByUserId', () => {
    it('returns vendor when found', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      const result = await VendorService.getVendorByUserId('usr_vendor')
      expect(result).toMatchObject(sampleVendor)
    })

    it('returns null when vendor not found', async () => {
      mockVendorFindFirst.mockResolvedValue(null)
      const result = await VendorService.getVendorByUserId('usr_unknown')
      expect(result).toBeNull()
    })
  })

  describe('getVendorEquipment', () => {
    it('throws NotFoundError when vendor not found', async () => {
      mockVendorFindFirst.mockResolvedValue(null)
      await expect(VendorService.getVendorEquipment('missing', {}, 'usr_01')).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError when non-admin and not own vendor', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      hasPermission.mockResolvedValue(false)
      await expect(VendorService.getVendorEquipment('vnd_01', {}, 'other_user')).rejects.toThrow(ForbiddenError)
    })

    it('returns equipment list', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      mockEquipmentFindMany.mockResolvedValue([{ id: 'eq_1', sku: 'SKU-1' }])
      mockEquipmentCount.mockResolvedValue(1)
      const result = await VendorService.getVendorEquipment('vnd_01', {}, 'usr_01')
      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
    })
  })

  describe('getVendorEarnings', () => {
    it('throws NotFoundError when vendor not found', async () => {
      mockVendorFindFirst.mockResolvedValue(null)
      await expect(VendorService.getVendorEarnings('missing', {}, 'usr_01')).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError when not admin and not vendor owner', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      hasPermission.mockResolvedValue(false)
      await expect(VendorService.getVendorEarnings('vnd_01', {}, 'other_user')).rejects.toThrow(ForbiddenError)
    })

    it('returns earnings with payouts', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      mockVendorPayoutFindMany.mockResolvedValue([
        { grossAmount: 1000, commissionAmount: 150, netAmount: 850 },
      ])
      const result = await VendorService.getVendorEarnings('vnd_01', {}, 'usr_01')
      expect(result).toHaveProperty('payouts')
      expect(result).toHaveProperty('totals')
    })

    it('returns earnings for own vendor without admin permission', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      hasPermission.mockResolvedValue(false)
      mockVendorPayoutFindMany.mockResolvedValue([])
      const result = await VendorService.getVendorEarnings('vnd_01', {}, 'usr_vendor')
      expect(result).toHaveProperty('payouts')
    })

    it('filters payouts by date range', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      mockVendorPayoutFindMany.mockResolvedValue([])
      await VendorService.getVendorEarnings(
        'vnd_01',
        { startDate: new Date('2025-01-01'), endDate: new Date('2025-01-31') },
        'usr_01'
      )
      expect(mockVendorPayoutFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      )
    })
  })

  describe('getVendorDashboardStats', () => {
    it('throws NotFoundError when vendor not found', async () => {
      mockVendorFindFirst.mockResolvedValue(null)
      await expect(VendorService.getVendorDashboardStats('missing', 'usr_01')).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError when non-owner and no permission', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      hasPermission.mockResolvedValue(false)
      await expect(VendorService.getVendorDashboardStats('vnd_01', 'other_user')).rejects.toThrow(ForbiddenError)
    })

    it('returns dashboard stats for owner', async () => {
      mockVendorFindFirst.mockResolvedValue(sampleVendor)
      mockEquipmentCount.mockResolvedValue(5)
      mockBookingEquipmentCount.mockResolvedValue(2)
      mockVendorPayoutAggregate.mockResolvedValue({ _sum: { netAmount: 5000 } })
      mockVendorPayoutFindMany.mockResolvedValue([])
      mockBookingFindMany.mockResolvedValue([])
      const result = await VendorService.getVendorDashboardStats('vnd_01', 'usr_vendor')
      expect(result).toHaveProperty('totalEquipment')
      expect(result).toHaveProperty('activeRentals')
      expect(result).toHaveProperty('thisMonthEarnings')
      expect(result).toHaveProperty('monthlyEarnings')
    })
  })

  describe('getMonthlyEarnings', () => {
    it('returns monthly earnings by month', async () => {
      mockVendorPayoutFindMany.mockResolvedValue([
        { grossAmount: 1000, netAmount: 850 },
      ])
      const result = await VendorService.getMonthlyEarnings('vnd_01', 3)
      expect(result).toHaveLength(3)
      expect(result[0]).toHaveProperty('month')
      expect(result[0]).toHaveProperty('gross')
      expect(result[0]).toHaveProperty('net')
    })
  })
})
