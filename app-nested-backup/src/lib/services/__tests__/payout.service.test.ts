/**
 * Unit tests for payout.service
 */
import { PayoutService } from '../payout.service'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: { findFirst: jest.fn() },
    vendor: { findFirst: jest.fn() },
    vendorPayout: { findFirst: jest.fn(), create: jest.fn() },
  },
}))
const mockVendorFindFirst = prisma.vendor.findFirst as jest.Mock
jest.mock('@/lib/auth/permissions', () => ({ hasPermission: jest.fn() }))
jest.mock('../audit.service', () => ({ AuditService: { log: jest.fn() } }))

const mockBookingFindFirst = prisma.booking.findFirst as jest.Mock
const mockVendorPayoutCreate = prisma.vendorPayout.create as jest.Mock
const mockHasPermission = hasPermission as jest.Mock

describe('PayoutService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHasPermission.mockResolvedValue(true)
    mockVendorFindFirst.mockResolvedValue({ id: 'v1', commissionRate: 10 })
  })

  it('createVendorPayoutsForBooking does nothing when booking not found', async () => {
    mockBookingFindFirst.mockResolvedValue(null)
    await PayoutService.createVendorPayoutsForBooking('book-1')
    expect(mockVendorPayoutCreate).not.toHaveBeenCalled()
  })

  it('createPayout creates when user has permission', async () => {
    mockVendorPayoutCreate.mockResolvedValue({ id: 'payout-1', vendorId: 'v1', status: 'PENDING' })
    const result = await PayoutService.createPayout({ vendorId: 'v1', grossAmount: 500 }, 'user-1')
    expect(result.id).toBe('payout-1')
  })
})
