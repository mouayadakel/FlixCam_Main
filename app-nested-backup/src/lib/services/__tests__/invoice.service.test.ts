/**
 * Invoice math tests — calculation formula validation.
 * Tests: subtotal → discount → tax → total
 * InvoiceService class tests — CRUD, permissions, autoGenerateForBooking
 */

import { InvoiceService } from '../invoice.service'
import { prisma } from '@/lib/db/prisma'
import { NotFoundError, ForbiddenError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    invoice: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: { findFirst: jest.fn() },
    booking: { findFirst: jest.fn() },
    payment: { create: jest.fn() },
    invoicePayment: { create: jest.fn() },
  },
}))

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

jest.mock('../audit.service', () => ({
  AuditService: { log: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock('@/lib/events/event-bus', () => ({
  EventBus: { emit: jest.fn().mockResolvedValue(undefined) },
}))

const mockInvoiceFindFirst = prisma.invoice.findFirst as jest.Mock
const mockInvoiceFindMany = prisma.invoice.findMany as jest.Mock
const mockInvoiceCreate = prisma.invoice.create as jest.Mock
const mockInvoiceUpdate = prisma.invoice.update as jest.Mock
const mockInvoiceCount = prisma.invoice.count as jest.Mock
const mockUserFindFirst = prisma.user.findFirst as jest.Mock
const mockBookingFindFirst = prisma.booking.findFirst as jest.Mock
const mockPaymentCreate = prisma.payment?.create as jest.Mock
const mockInvoicePaymentCreate = prisma.invoicePayment?.create as jest.Mock
const hasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock
const { AuditService } = require('../audit.service')

const baseInvoice = {
  id: 'inv1',
  invoiceNumber: 'INV-2026-ABC-123',
  customerId: 'c1',
  bookingId: null,
  type: 'BOOKING',
  status: 'DRAFT',
  issueDate: new Date('2026-03-01'),
  dueDate: new Date('2026-04-01'),
  subtotal: 1000,
  discount: null,
  vatAmount: 150,
  totalAmount: 1150,
  paidAmount: 0,
  remainingAmount: 1150,
  items: [{ description: 'Camera', quantity: 1, unitPrice: 1000, total: 1000 }],
  notes: null,
  paymentTerms: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'u1',
  customer: { id: 'c1', name: 'Customer', email: 'c@test.com' },
  booking: null,
}

describe('Invoice Math — calculateTotals', () => {
  function calculateTotals(
    items: Array<{ description: string; quantity: number; unitPrice: number; days?: number }>,
    discount: number = 0,
    vatRate: number = 0.15
  ): {
    subtotal: number
    vatAmount: number
    totalAmount: number
    itemTotals: number[]
  } {
    const itemTotals = items.map((item) => {
      const days = item.days ?? 1
      return Math.round(item.quantity * days * item.unitPrice * 100) / 100
    })
    const subtotal = Math.round(itemTotals.reduce((sum, t) => sum + t, 0) * 100) / 100
    const taxableAmount = Math.max(0, subtotal - discount)
    const vatAmount = Math.round(taxableAmount * vatRate * 100) / 100
    const totalAmount = Math.round((taxableAmount + vatAmount) * 100) / 100
    return { subtotal, vatAmount, totalAmount, itemTotals }
  }

  test('Test 1: No discount, no tax (0% VAT) — subtotal = grand total', () => {
    const result = calculateTotals(
      [{ description: 'Camera', quantity: 1, unitPrice: 1000 }],
      0,
      0
    )
    expect(result.subtotal).toBe(1000)
    expect(result.vatAmount).toBe(0)
    expect(result.totalAmount).toBe(1000)
  })

  test('Test 2: 10% discount, no tax — subtotal 1000, discount 100, total 900', () => {
    const result = calculateTotals(
      [{ description: 'Camera', quantity: 1, unitPrice: 1000 }],
      100,
      0
    )
    expect(result.subtotal).toBe(1000)
    expect(result.totalAmount).toBe(900)
  })

  test('Test 3: 15% VAT on post-discount amount — taxable 900, tax 135, total 1035', () => {
    const result = calculateTotals(
      [{ description: 'Camera', quantity: 1, unitPrice: 1000 }],
      100,
      0.15
    )
    expect(result.subtotal).toBe(1000)
    expect(result.vatAmount).toBe(135)
    expect(result.totalAmount).toBe(1035)
  })

  test('Test 4: Discount + Tax combined — subtotal 1000, 10% disc → 900, 15% tax → 135, total 1035', () => {
    const result = calculateTotals(
      [{ description: 'Camera', quantity: 1, unitPrice: 1000 }],
      100,
      0.15
    )
    expect(result.vatAmount).toBe(135)
    expect(result.totalAmount).toBe(1035)
  })

  test('Test 5: Balance due = grand total - amount paid', () => {
    const result = calculateTotals(
      [{ description: 'Camera', quantity: 1, unitPrice: 1000 }],
      0,
      0.15
    )
    const amountPaid = 500
    const balanceDue = Math.round((result.totalAmount - amountPaid) * 100) / 100
    expect(balanceDue).toBe(650)
  })

  test('Test 6: 100% payment — balance due = 0', () => {
    const result = calculateTotals(
      [{ description: 'Camera', quantity: 1, unitPrice: 1000 }],
      0,
      0.15
    )
    const amountPaid = result.totalAmount
    const balanceDue = Math.round((result.totalAmount - amountPaid) * 100) / 100
    expect(balanceDue).toBe(0)
    const isPaid = balanceDue <= 0
    expect(isPaid).toBe(true)
  })

  test('Test 7: Partial payment — balance due = correct remainder', () => {
    const result = calculateTotals(
      [{ description: 'Camera', quantity: 2, unitPrice: 500, days: 3 }],
      200,
      0.15
    )
    // Subtotal: 2 * 3 * 500 = 3000
    // Taxable: 3000 - 200 = 2800
    // VAT: 2800 * 0.15 = 420
    // Total: 2800 + 420 = 3220
    expect(result.subtotal).toBe(3000)
    expect(result.vatAmount).toBe(420)
    expect(result.totalAmount).toBe(3220)

    const amountPaid = 1000
    const balanceDue = Math.round((result.totalAmount - amountPaid) * 100) / 100
    expect(balanceDue).toBe(2220)
  })

  test('Test 8: Discount cannot make subtotal negative — Math.max(0, subtotal - discount)', () => {
    const result = calculateTotals(
      [{ description: 'Small item', quantity: 1, unitPrice: 50 }],
      200,
      0.15
    )
    // Subtotal: 50, discount: 200 → taxable = max(0, 50-200) = 0
    expect(result.subtotal).toBe(50)
    expect(result.vatAmount).toBe(0)
    expect(result.totalAmount).toBe(0)
  })

  test('Test 9: Late return fee added as line item — appears correctly in totals', () => {
    const result = calculateTotals(
      [
        { description: 'Camera Rental', quantity: 1, unitPrice: 500, days: 5 },
        { description: 'Late Return Fee (2 days × 150%)', quantity: 1, unitPrice: 1500 },
      ],
      0,
      0.15
    )
    // Camera: 1 * 5 * 500 = 2500
    // Late fee: 1 * 1 * 1500 = 1500
    // Subtotal: 4000
    // VAT: 4000 * 0.15 = 600
    // Total: 4600
    expect(result.subtotal).toBe(4000)
    expect(result.vatAmount).toBe(600)
    expect(result.totalAmount).toBe(4600)
    expect(result.itemTotals).toEqual([2500, 1500])
  })

  test('Test 10: All amounts are integers-safe (no floating-point drift)', () => {
    const result = calculateTotals(
      [
        { description: 'Item A', quantity: 3, unitPrice: 33.33, days: 7 },
        { description: 'Item B', quantity: 1, unitPrice: 19.99 },
      ],
      50,
      0.15
    )
    // Item A: 3 * 7 * 33.33 = 699.93
    // Item B: 1 * 1 * 19.99 = 19.99
    // Subtotal: 719.92
    // Taxable: 719.92 - 50 = 669.92
    // VAT: 669.92 * 0.15 = 100.488 → 100.49
    // Total: 669.92 + 100.49 = 770.41
    expect(result.subtotal).toBe(719.92)
    expect(result.vatAmount).toBe(100.49)
    expect(result.totalAmount).toBe(770.41)
    expect(Number.isFinite(result.totalAmount)).toBe(true)
    expect(String(result.totalAmount).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2)
  })
})

describe('InvoiceService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    hasPermission.mockResolvedValue(true)
  })

  describe('create', () => {
    it('throws ForbiddenError when user lacks invoice.create', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        InvoiceService.create(
          {
            customerId: 'c1',
            type: 'booking',
            issueDate: new Date(),
            dueDate: new Date('2026-04-01'),
            items: [{ description: 'Camera', quantity: 1, unitPrice: 1000 }],
          },
          'u1'
        )
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when customer not found', async () => {
      mockUserFindFirst.mockResolvedValue(null)
      await expect(
        InvoiceService.create(
          {
            customerId: 'c1',
            type: 'booking',
            issueDate: new Date(),
            dueDate: new Date('2026-04-01'),
            items: [{ description: 'Camera', quantity: 1, unitPrice: 1000 }],
          },
          'u1'
        )
      ).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when booking not found', async () => {
      mockUserFindFirst.mockResolvedValue({ id: 'c1' })
      mockBookingFindFirst.mockResolvedValue(null)
      await expect(
        InvoiceService.create(
          {
            customerId: 'c1',
            bookingId: 'missing',
            type: 'booking',
            issueDate: new Date(),
            dueDate: new Date('2026-04-01'),
            items: [{ description: 'Camera', quantity: 1, unitPrice: 1000 }],
          },
          'u1'
        )
      ).rejects.toThrow(NotFoundError)
    })

    it('creates invoice successfully', async () => {
      mockUserFindFirst.mockResolvedValue({ id: 'c1' })
      mockInvoiceFindFirst.mockResolvedValue(null)
      mockInvoiceCreate.mockResolvedValue({
        ...baseInvoice,
        items: baseInvoice.items,
      })
      const result = await InvoiceService.create(
        {
          customerId: 'c1',
          type: 'booking',
          issueDate: new Date('2026-03-01'),
          dueDate: new Date('2026-04-01'),
          items: [{ description: 'Camera', quantity: 1, unitPrice: 1000 }],
        },
        'u1'
      )
      expect(result).toBeDefined()
      expect(mockInvoiceCreate).toHaveBeenCalled()
    })

    it('retries generateInvoiceNumber when collision occurs', async () => {
      mockUserFindFirst.mockResolvedValue({ id: 'c1' })
      mockInvoiceFindFirst
        .mockResolvedValueOnce({ id: 'existing' })
        .mockResolvedValueOnce(null)
      mockInvoiceCreate.mockResolvedValue({
        ...baseInvoice,
        items: baseInvoice.items,
      })
      const result = await InvoiceService.create(
        {
          customerId: 'c1',
          type: 'booking',
          issueDate: new Date('2026-03-01'),
          dueDate: new Date('2026-04-01'),
          items: [{ description: 'Camera', quantity: 1, unitPrice: 1000 }],
        },
        'u1'
      )
      expect(result).toBeDefined()
      expect(mockInvoiceFindFirst.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('passes auditContext ipAddress and userAgent to AuditService when provided', async () => {
      mockUserFindFirst.mockResolvedValue({ id: 'c1' })
      mockInvoiceFindFirst.mockResolvedValue(null)
      mockInvoiceCreate.mockResolvedValue({
        ...baseInvoice,
        items: baseInvoice.items,
      })
      await InvoiceService.create(
        {
          customerId: 'c1',
          type: 'booking',
          issueDate: new Date('2026-03-01'),
          dueDate: new Date('2026-04-01'),
          items: [{ description: 'Camera', quantity: 1, unitPrice: 1000 }],
        },
        'u1',
        { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0' }
      )
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'invoice.created',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      )
    })

    it('creates invoice with type deposit, refund, adjustment', async () => {
      mockUserFindFirst.mockResolvedValue({ id: 'c1' })
      mockInvoiceFindFirst.mockResolvedValue(null)
      for (const type of ['deposit', 'refund', 'adjustment'] as const) {
        mockInvoiceCreate.mockResolvedValue({
          ...baseInvoice,
          type: type.toUpperCase(),
          items: baseInvoice.items,
        })
        const result = await InvoiceService.create(
          {
            customerId: 'c1',
            type,
            issueDate: new Date('2026-03-01'),
            dueDate: new Date('2026-04-01'),
            items: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
          },
          'u1'
        )
        expect(result).toBeDefined()
        expect(mockInvoiceCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              type: type.toUpperCase(),
            }),
          })
        )
      }
    })

    it('creates invoice with OVERDUE status when dueDate is in past', async () => {
      mockUserFindFirst.mockResolvedValue({ id: 'c1' })
      mockInvoiceFindFirst.mockResolvedValue(null)
      mockInvoiceCreate.mockResolvedValue({
        ...baseInvoice,
        status: 'OVERDUE',
        items: baseInvoice.items,
      })
      const pastDue = new Date('2020-01-01')
      await InvoiceService.create(
        {
          customerId: 'c1',
          type: 'booking',
          issueDate: new Date('2019-12-01'),
          dueDate: pastDue,
          items: [{ description: 'Camera', quantity: 1, unitPrice: 1000 }],
        },
        'u1'
      )
      expect(mockInvoiceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'OVERDUE',
          }),
        })
      )
    })

    it('creates invoice with discount when discount > 0', async () => {
      mockUserFindFirst.mockResolvedValue({ id: 'c1' })
      mockInvoiceFindFirst.mockResolvedValue(null)
      mockInvoiceCreate.mockResolvedValue({
        ...baseInvoice,
        discount: 100,
        items: baseInvoice.items,
      })
      await InvoiceService.create(
        {
          customerId: 'c1',
          type: 'booking',
          issueDate: new Date('2026-03-01'),
          dueDate: new Date('2026-04-01'),
          items: [{ description: 'Camera', quantity: 1, unitPrice: 1000 }],
          discount: 100,
        },
        'u1'
      )
      expect(mockInvoiceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            discount: expect.anything(),
          }),
        })
      )
    })
  })

  describe('getById', () => {
    it('throws ForbiddenError when user lacks invoice.read', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(InvoiceService.getById('inv1', 'u1')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when invoice not found', async () => {
      mockInvoiceFindFirst.mockResolvedValue(null)
      await expect(InvoiceService.getById('missing', 'u1')).rejects.toThrow(NotFoundError)
    })

    it('returns invoice when found', async () => {
      mockInvoiceFindFirst.mockResolvedValue(baseInvoice)
      const result = await InvoiceService.getById('inv1', 'u1')
      expect(result).toBeDefined()
      expect(result.id).toBe('inv1')
    })

    it('returns invoice with PARTIALLY_PAID status', async () => {
      mockInvoiceFindFirst.mockResolvedValue({ ...baseInvoice, status: 'PARTIALLY_PAID' })
      const result = await InvoiceService.getById('inv1', 'u1')
      expect(result.status).toBe('partially_paid')
    })
  })

  describe('list', () => {
    it('throws ForbiddenError when user lacks invoice.read', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(InvoiceService.list('u1')).rejects.toThrow(ForbiddenError)
    })

    it('returns paginated invoices', async () => {
      mockInvoiceFindMany.mockResolvedValue([baseInvoice])
      mockInvoiceCount.mockResolvedValue(1)
      const result = await InvoiceService.list('u1')
      expect(result.invoices).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('applies status, type, overdue, dateFrom, dateTo filters', async () => {
      mockInvoiceFindMany.mockResolvedValue([])
      mockInvoiceCount.mockResolvedValue(0)
      await InvoiceService.list('u1', {
        status: 'partially_paid',
        type: 'refund',
        overdue: true,
        dateFrom: new Date('2026-01-01'),
        dateTo: new Date('2026-12-31'),
      })
      expect(mockInvoiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: expect.anything(),
            type: expect.anything(),
            issueDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      )
    })

    it('applies customerId and bookingId filters', async () => {
      mockInvoiceFindMany.mockResolvedValue([])
      mockInvoiceCount.mockResolvedValue(0)
      await InvoiceService.list('u1', { customerId: 'c1', bookingId: 'bk1' })
      expect(mockInvoiceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: 'c1',
            bookingId: 'bk1',
          }),
        })
      )
    })
  })

  describe('update', () => {
    it('throws ForbiddenError when user lacks invoice.update', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        InvoiceService.update('inv1', { notes: 'Updated' }, 'u1')
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when invoice not found', async () => {
      mockInvoiceFindFirst.mockResolvedValue(null)
      await expect(
        InvoiceService.update('missing', { notes: 'x' }, 'u1')
      ).rejects.toThrow(NotFoundError)
    })

    it('updates invoice when valid', async () => {
      mockInvoiceFindFirst.mockResolvedValue(baseInvoice)
      mockInvoiceUpdate.mockResolvedValue({ ...baseInvoice, notes: 'Updated' })
      const result = await InvoiceService.update('inv1', { notes: 'Updated' }, 'u1')
      expect(result).toBeDefined()
      expect(mockInvoiceUpdate).toHaveBeenCalled()
    })

    it('passes auditContext ipAddress and userAgent to AuditService when provided', async () => {
      mockInvoiceFindFirst.mockResolvedValue(baseInvoice)
      mockInvoiceUpdate.mockResolvedValue({ ...baseInvoice, notes: 'Updated' })
      await InvoiceService.update(
        'inv1',
        { notes: 'Updated' },
        'u1',
        { ipAddress: '10.0.0.1', userAgent: 'TestAgent' }
      )
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'invoice.updated',
          ipAddress: '10.0.0.1',
          userAgent: 'TestAgent',
        })
      )
    })
  })

  describe('delete', () => {
    it('throws ForbiddenError when user lacks invoice.delete', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(InvoiceService.delete('inv1', 'u1')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when invoice not found', async () => {
      mockInvoiceFindFirst.mockResolvedValue(null)
      await expect(InvoiceService.delete('missing', 'u1')).rejects.toThrow(NotFoundError)
    })

    it('soft-deletes invoice when valid', async () => {
      mockInvoiceFindFirst.mockResolvedValue(baseInvoice)
      mockInvoiceUpdate.mockResolvedValue({ ...baseInvoice, deletedAt: new Date() })
      await InvoiceService.delete('inv1', 'u1')
      expect(mockInvoiceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
    })

    it('passes auditContext ipAddress and userAgent to AuditService when provided', async () => {
      mockInvoiceFindFirst.mockResolvedValue(baseInvoice)
      mockInvoiceUpdate.mockResolvedValue({ ...baseInvoice, deletedAt: new Date() })
      await InvoiceService.delete('inv1', 'u1', {
        ipAddress: '127.0.0.1',
        userAgent: 'Jest',
      })
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'invoice.deleted',
          ipAddress: '127.0.0.1',
          userAgent: 'Jest',
        })
      )
    })
  })

  describe('autoGenerateForBooking', () => {
    it('returns existing invoice when one already exists for booking', async () => {
      mockInvoiceFindFirst.mockResolvedValue(baseInvoice)
      const result = await InvoiceService.autoGenerateForBooking('bk1')
      expect(result).toBeDefined()
      expect(mockInvoiceCreate).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when booking not found', async () => {
      mockInvoiceFindFirst.mockResolvedValue(null)
      mockBookingFindFirst.mockResolvedValue(null)
      await expect(InvoiceService.autoGenerateForBooking('missing')).rejects.toThrow(NotFoundError)
    })

    it('creates invoice when booking exists and no invoice', async () => {
      const booking = {
        id: 'bk1',
        customerId: 'c1',
        customer: { id: 'c1', name: 'C', email: 'c@test.com', phone: null, taxId: null, companyName: null, billingAddress: null },
        equipment: [
          {
            equipment: { model: 'Cam', sku: 'CAM1', dailyPrice: 100, weeklyPrice: null, monthlyPrice: null },
            quantity: 1,
          },
        ],
        payments: [],
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-05'),
        createdBy: 'u1',
      }
      mockInvoiceFindFirst.mockResolvedValue(null)
      mockBookingFindFirst.mockResolvedValue(booking)
      mockInvoiceCreate.mockResolvedValue({
        ...baseInvoice,
        bookingId: 'bk1',
        booking: { id: 'bk1', bookingNumber: 'BK-1' },
      })
      const result = await InvoiceService.autoGenerateForBooking('bk1')
      expect(result).toBeDefined()
      expect(mockInvoiceCreate).toHaveBeenCalled()
    })

    it('creates invoice with PAID status when booking has full payment', async () => {
      const booking = {
        id: 'bk1',
        customerId: 'c1',
        customer: { id: 'c1', name: 'C', email: 'c@test.com', phone: null, taxId: null, companyName: null, billingAddress: null },
        equipment: [
          {
            equipment: { model: 'Cam', sku: 'CAM1', dailyPrice: 100, weeklyPrice: null, monthlyPrice: null },
            quantity: 1,
          },
        ],
        payments: [{ amount: { toNumber: () => 500 } }],
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-05'),
        createdBy: 'u1',
      }
      mockInvoiceFindFirst.mockResolvedValue(null)
      mockBookingFindFirst.mockResolvedValue(booking)
      mockInvoiceCreate.mockResolvedValue({
        ...baseInvoice,
        bookingId: 'bk1',
        status: 'PAID',
      })
      const result = await InvoiceService.autoGenerateForBooking('bk1')
      expect(result).toBeDefined()
      expect(mockInvoiceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAID',
          }),
        })
      )
    })
  })

  describe('recordPayment', () => {
    it('throws ForbiddenError when user lacks invoice.mark_paid', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        InvoiceService.recordPayment('inv1', { amount: 500, paymentMethod: 'CARD' }, 'u1')
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when invoice not found', async () => {
      mockInvoiceFindFirst.mockResolvedValue(null)
      await expect(
        InvoiceService.recordPayment('missing', { amount: 500, paymentMethod: 'CARD' }, 'u1')
      ).rejects.toThrow(NotFoundError)
    })

    it('records partial payment and updates status to PARTIALLY_PAID', async () => {
      const inv = { ...baseInvoice, paidAmount: 0, totalAmount: 1150, remainingAmount: 1150 }
      mockInvoiceFindFirst.mockResolvedValue(inv)
      mockInvoiceUpdate.mockResolvedValue({
        ...inv,
        paidAmount: 500,
        remainingAmount: 650,
        status: 'PARTIALLY_PAID',
      })
      const result = await InvoiceService.recordPayment('inv1', { amount: 500, paymentMethod: 'CARD' }, 'u1')
      expect(result).toBeDefined()
      expect(mockInvoiceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paidAmount: expect.anything(),
            remainingAmount: expect.anything(),
            status: 'PARTIALLY_PAID',
          }),
        })
      )
    })

    it('passes auditContext ipAddress and userAgent to AuditService when provided', async () => {
      const inv = { ...baseInvoice, paidAmount: 0, totalAmount: 1150, remainingAmount: 1150 }
      mockInvoiceFindFirst.mockResolvedValue(inv)
      mockInvoiceUpdate.mockResolvedValue({
        ...inv,
        paidAmount: 500,
        remainingAmount: 650,
        status: 'PARTIALLY_PAID',
      })
      await InvoiceService.recordPayment(
        'inv1',
        { amount: 500, paymentMethod: 'CARD' },
        'u1',
        { ipAddress: '1.2.3.4', userAgent: 'Chrome' }
      )
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'invoice.payment_recorded',
          ipAddress: '1.2.3.4',
          userAgent: 'Chrome',
        })
      )
    })

    it('records full payment and updates status to PAID', async () => {
      const inv = { ...baseInvoice, paidAmount: 0, totalAmount: 1150, remainingAmount: 1150 }
      mockInvoiceFindFirst.mockResolvedValue(inv)
      mockInvoiceUpdate.mockResolvedValue({
        ...inv,
        paidAmount: 1150,
        remainingAmount: 0,
        status: 'PAID',
      })
      const result = await InvoiceService.recordPayment('inv1', { amount: 1150, paymentMethod: 'CARD' }, 'u1')
      expect(result).toBeDefined()
      expect(mockInvoiceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAID' }),
        })
      )
    })

    it('creates payment and invoicePayment when invoice has bookingId', async () => {
      const inv = { ...baseInvoice, bookingId: 'bk1', paidAmount: 0, totalAmount: 1150 }
      mockInvoiceFindFirst.mockResolvedValue(inv)
      mockInvoiceUpdate.mockResolvedValue({ ...inv, status: 'PAID' })
      mockPaymentCreate?.mockResolvedValue({ id: 'pay1' })
      mockInvoicePaymentCreate?.mockResolvedValue({})
      await InvoiceService.recordPayment('inv1', { amount: 500, paymentMethod: 'CARD' }, 'u1')
      expect(mockPaymentCreate).toHaveBeenCalled()
      expect(mockInvoicePaymentCreate).toHaveBeenCalled()
    })
  })

  describe('generateFromBooking', () => {
    it('throws ForbiddenError when user lacks invoice.create', async () => {
      hasPermission.mockResolvedValue(false)
      mockBookingFindFirst.mockResolvedValue({ id: 'bk1', customerId: 'c1' })
      mockInvoiceFindFirst.mockResolvedValue(null)
      await expect(InvoiceService.generateFromBooking('bk1', 'u1')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when booking not found', async () => {
      mockBookingFindFirst.mockResolvedValue(null)
      await expect(InvoiceService.generateFromBooking('missing', 'u1')).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when invoice already exists for booking', async () => {
      const booking = {
        id: 'bk1',
        customerId: 'c1',
        customer: { id: 'c1', name: 'C', email: 'c@test.com', phone: null, taxId: null, companyName: null, billingAddress: null },
        equipment: [
          {
            equipment: { id: 'e1', sku: 'CAM1', model: 'Cam', dailyPrice: 100, categoryId: 'cat1', category: { id: 'cat1', name: 'Cameras' } },
            quantity: 1,
          },
        ],
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-05'),
        bookingNumber: 'BK-1',
      }
      mockBookingFindFirst.mockResolvedValue(booking)
      mockInvoiceFindFirst.mockResolvedValue({ id: 'inv1' })
      const { ValidationError } = require('@/lib/errors')
      await expect(InvoiceService.generateFromBooking('bk1', 'u1')).rejects.toThrow(ValidationError)
    })

    it('creates invoice from booking', async () => {
      const booking = {
        id: 'bk1',
        customerId: 'c1',
        customer: { id: 'c1', name: 'C', email: 'c@test.com', phone: null, taxId: null, companyName: null, billingAddress: null },
        equipment: [
          {
            equipment: { id: 'e1', sku: 'CAM1', model: 'Cam', dailyPrice: 100, categoryId: 'cat1', category: { id: 'cat1', name: 'Cameras' } },
            quantity: 1,
          },
        ],
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-05'),
        bookingNumber: 'BK-1',
      }
      mockBookingFindFirst.mockResolvedValue(booking)
      mockInvoiceFindFirst.mockResolvedValue(null)
      mockUserFindFirst.mockResolvedValue({ id: 'c1' })
      mockInvoiceCreate.mockResolvedValue({ ...baseInvoice, bookingId: 'bk1' })
      const result = await InvoiceService.generateFromBooking('bk1', 'u1')
      expect(result).toBeDefined()
      expect(mockInvoiceCreate).toHaveBeenCalled()
    })

    it('creates invoice from booking with equipment without model and without category', async () => {
      const booking = {
        id: 'bk1',
        customerId: 'c1',
        customer: { id: 'c1', name: 'C', email: 'c@test.com', phone: null, taxId: null, companyName: null, billingAddress: null },
        equipment: [
          {
            equipment: { id: 'e1', sku: 'CAM1', model: null, dailyPrice: 100, categoryId: null, category: null },
            quantity: 1,
          },
        ],
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-05'),
        bookingNumber: 'BK-1',
      }
      mockBookingFindFirst.mockResolvedValue(booking)
      mockInvoiceFindFirst.mockResolvedValue(null)
      mockUserFindFirst.mockResolvedValue({ id: 'c1' })
      mockInvoiceCreate.mockResolvedValue({ ...baseInvoice, bookingId: 'bk1' })
      const result = await InvoiceService.generateFromBooking('bk1', 'u1')
      expect(result).toBeDefined()
      const createCall = mockInvoiceCreate.mock.calls[0]
      const items = createCall[0]?.data?.items as Array<{ description?: string; categoryId?: string; categoryName?: string }>
      expect(items?.[0]?.description).toContain('CAM1')
      expect(items?.[0]?.description).not.toContain(' - ')
      expect(items?.[0]?.categoryId).toBeUndefined()
      expect(items?.[0]?.categoryName).toBeUndefined()
    })

    it('passes auditContext to create when provided', async () => {
      const booking = {
        id: 'bk1',
        customerId: 'c1',
        customer: { id: 'c1', name: 'C', email: 'c@test.com', phone: null, taxId: null, companyName: null, billingAddress: null },
        equipment: [
          {
            equipment: { id: 'e1', sku: 'CAM1', model: 'Cam', dailyPrice: 100, categoryId: 'cat1', category: { id: 'cat1', name: 'Cameras' } },
            quantity: 1,
          },
        ],
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-05'),
        bookingNumber: 'BK-1',
      }
      mockBookingFindFirst.mockResolvedValue(booking)
      mockInvoiceFindFirst.mockResolvedValue(null)
      mockUserFindFirst.mockResolvedValue({ id: 'c1' })
      mockInvoiceCreate.mockResolvedValue({ ...baseInvoice, bookingId: 'bk1' })
      await InvoiceService.generateFromBooking('bk1', 'u1', {
        ipAddress: '5.6.7.8',
        userAgent: 'Safari',
      })
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'invoice.created',
          ipAddress: '5.6.7.8',
          userAgent: 'Safari',
        })
      )
    })
  })

  describe('update with items and discount', () => {
    it('recalculates totals when items change', async () => {
      const existing = { ...baseInvoice, discount: 0, paidAmount: 0 }
      mockInvoiceFindFirst.mockResolvedValue(existing)
      mockInvoiceUpdate.mockResolvedValue({ ...existing, totalAmount: 2000 })
      const result = await InvoiceService.update(
        'inv1',
        {
          items: [{ description: 'Camera', quantity: 2, unitPrice: 1000 }],
        },
        'u1'
      )
      expect(result).toBeDefined()
      expect(mockInvoiceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: expect.anything(),
            vatAmount: expect.anything(),
            totalAmount: expect.anything(),
          }),
        })
      )
    })

    it('recalculates totals when discount changes', async () => {
      const existing = { ...baseInvoice, discount: 0, paidAmount: 0 }
      mockInvoiceFindFirst.mockResolvedValue(existing)
      mockInvoiceUpdate.mockResolvedValue({ ...existing, discount: 100 })
      const result = await InvoiceService.update('inv1', { discount: 100 }, 'u1')
      expect(result).toBeDefined()
      expect(mockInvoiceUpdate).toHaveBeenCalled()
    })
  })

  describe('getById overdue', () => {
    it('auto-updates status to OVERDUE when dueDate passed', async () => {
      const overdueInv = {
        ...baseInvoice,
        dueDate: new Date('2020-01-01'),
        status: 'SENT',
      }
      mockInvoiceFindFirst.mockResolvedValue(overdueInv)
      mockInvoiceUpdate.mockResolvedValue({ ...overdueInv, status: 'OVERDUE' })
      const result = await InvoiceService.getById('inv1', 'u1')
      expect(mockInvoiceUpdate).toHaveBeenCalledWith({
        where: { id: 'inv1' },
        data: { status: 'OVERDUE' },
      })
      expect(result).toBeDefined()
    })
  })
})
