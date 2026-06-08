/**
 * Unit tests for payout.service
 */
import { Decimal } from '@prisma/client/runtime/library'
import { PayoutService } from '../payout.service'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

const mockTxVendorFindFirst = jest.fn()
const mockTxVendorPayoutCreate = jest.fn()
const mockTxLedgerCreate = jest.fn()

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        vendor: { findFirst: mockTxVendorFindFirst },
        vendorPayout: { create: mockTxVendorPayoutCreate },
        ledgerEntry: { create: mockTxLedgerCreate },
      })
    ),
    booking: { findFirst: jest.fn() },
    vendor: { findFirst: jest.fn() },
    vendorPayout: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}))
const mockBookingFindFirst = prisma.booking.findFirst as jest.Mock
jest.mock('@/lib/auth/permissions', () => ({
  ...jest.requireActual('@/lib/auth/permissions'),
  hasPermission: jest.fn(),
}))
jest.mock('../audit.service', () => ({ AuditService: { log: jest.fn() } }))

const mockHasPermission = hasPermission as jest.Mock

describe('PayoutService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHasPermission.mockResolvedValue(true)
    mockTxVendorFindFirst.mockResolvedValue({
      id: 'v1',
      companyName: 'Vendor Co',
      commissionRate: new Decimal(10),
    })
    mockTxVendorPayoutCreate.mockResolvedValue({
      id: 'payout-1',
      vendorId: 'v1',
      status: 'PENDING',
    })
  })

  it('createVendorPayoutsForBooking does nothing when booking not found', async () => {
    mockBookingFindFirst.mockResolvedValue(null)
    await PayoutService.createVendorPayoutsForBooking('book-1')
    expect(mockTxVendorPayoutCreate).not.toHaveBeenCalled()
  })

  it('createPayout creates payout and ledger entry in transaction', async () => {
    const result = await PayoutService.createPayout({ vendorId: 'v1', grossAmount: 500 }, 'user-1')
    expect(result.id).toBe('payout-1')
    expect(mockTxVendorPayoutCreate).toHaveBeenCalled()
    expect(mockTxLedgerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'DEBIT',
          account: 'VENDOR_PAYOUT',
          payoutId: 'payout-1',
        }),
      })
    )
  })
})
