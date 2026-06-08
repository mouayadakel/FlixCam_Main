/**
 * Unit tests for PaymentService
 */

import { PaymentService } from '../payment.service'
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors'
import { prisma } from '@/lib/db/prisma'
import { BookingStatus, PaymentStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import * as permissions from '@/lib/auth/permissions'

const mockTxRefundCreate = jest.fn()
const mockTxPaymentUpdate = jest.fn()
const mockTxInvoiceFindFirst = jest.fn()
const mockTxInvoiceUpdate = jest.fn()
const mockTxLedgerEntryCreate = jest.fn()

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) =>
      callback({
        refund: { create: mockTxRefundCreate },
        payment: { update: mockTxPaymentUpdate },
        invoice: { findFirst: mockTxInvoiceFindFirst, update: mockTxInvoiceUpdate },
        ledgerEntry: { create: mockTxLedgerEntryCreate, findFirst: jest.fn() },
      })
    ),
    booking: { findFirst: jest.fn() },
    companySettings: { findFirst: jest.fn() },
    payment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    ledgerEntry: { findFirst: jest.fn(), create: jest.fn() },
    refund: { create: jest.fn() },
    invoice: { findFirst: jest.fn(), update: jest.fn() },
  },
}))

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

jest.mock('../audit.service', () => ({ AuditService: { log: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('@/lib/events/event-bus', () => ({ EventBus: { emit: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('../booking.service', () => ({
  BookingService: { transitionState: jest.fn().mockResolvedValue(undefined) },
}))
jest.mock('../invoice.service', () => ({
  InvoiceService: {
    autoGenerateForBooking: jest.fn().mockResolvedValue(undefined),
    syncBookingInvoicePayments: jest.fn().mockResolvedValue(undefined),
  },
}))
jest.mock('../email.service', () => ({
  EmailService: {
    sendPaymentDocumentsEmail: jest.fn().mockResolvedValue({ ok: true }),
  },
}))
jest.mock('../order-notification.service', () => ({
  OrderNotificationService: {
    notifyPaymentConfirmed: jest.fn().mockResolvedValue(undefined),
    notifyPaymentConfirmedExtraEmails: jest.fn().mockResolvedValue(undefined),
    notifyPaymentFailed: jest.fn().mockResolvedValue(undefined),
  },
}))
jest.mock('../messaging-automation.service', () => ({
  hasActiveAutomationRulesForTrigger: jest.fn().mockResolvedValue(false),
}))

jest.mock('../payment-gateway-config.service', () => ({
  PaymentGatewayConfigService: {
    getConfig: jest.fn().mockResolvedValue({}),
  },
}))

jest.mock('@/lib/integrations/payment-gateway/registry', () => ({
  getAdapter: jest.fn(() => ({
    refund: jest.fn().mockResolvedValue({ success: true }),
  })),
}))
const mockApprovalRequest = jest.fn()
const mockApprovalGetById = jest.fn()
jest.mock('../approval.service', () => ({
  ApprovalService: {
    request: (...args: unknown[]) => mockApprovalRequest(...args),
    getById: (...args: unknown[]) => mockApprovalGetById(...args),
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockPaymentFindFirst = mockPrisma.payment.findFirst as jest.Mock
const mockPaymentFindMany = mockPrisma.payment.findMany as jest.Mock
const mockPaymentCreate = mockPrisma.payment.create as jest.Mock
const mockPaymentUpdate = mockPrisma.payment.update as jest.Mock
const mockPaymentCount = mockPrisma.payment.count as jest.Mock
const mockPaymentAggregate = mockPrisma.payment.aggregate as jest.Mock
const { OrderNotificationService } = require('../order-notification.service')
const { EmailService } = require('../email.service')
const { hasActiveAutomationRulesForTrigger } = require('../messaging-automation.service')

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(permissions.hasPermission as jest.Mock).mockResolvedValue(true)
    ;(hasActiveAutomationRulesForTrigger as jest.Mock).mockResolvedValue(false)
    mockApprovalRequest.mockResolvedValue({ id: 'apr-1', status: 'pending' })
    mockApprovalGetById.mockResolvedValue(null)
    ;(mockPrisma.companySettings.findFirst as jest.Mock).mockResolvedValue({ vatRate: 15 })
  })

  describe('create', () => {
    const validInput = {
      bookingId: 'booking-1',
      amount: 100,
      userId: 'user-1',
    }

    it('creates payment when booking is PAYMENT_PENDING and no existing payment', async () => {
      ;(mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.PAYMENT_PENDING,
      })
      mockPaymentFindFirst.mockResolvedValue(null)
      mockPaymentCreate.mockResolvedValue({
        id: 'pay-1',
        bookingId: 'booking-1',
        amount: new Decimal(100),
        status: PaymentStatus.PENDING,
      })
      const result = await PaymentService.create(validInput)
      expect(result.id).toBe('pay-1')
      expect(mockPaymentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bookingId: 'booking-1',
            status: PaymentStatus.PENDING,
          }),
        })
      )
    })

    it('throws ForbiddenError when user lacks permission', async () => {
      ;(permissions.hasPermission as jest.Mock).mockResolvedValue(false)
      await expect(PaymentService.create(validInput)).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when booking does not exist', async () => {
      ;(mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null)
      await expect(PaymentService.create(validInput)).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when booking is not in PAYMENT_PENDING state', async () => {
      ;(mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.DRAFT,
      } as any)
      mockPaymentFindFirst.mockResolvedValue(null)
      await expect(PaymentService.create(validInput)).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when payment already exists for booking', async () => {
      ;(mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.PAYMENT_PENDING,
      } as any)
      mockPaymentFindFirst.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.PENDING,
      } as any)
      await expect(PaymentService.create(validInput)).rejects.toThrow(ValidationError)
    })
  })

  describe('process', () => {
    it('processes payment and updates booking to CONFIRMED', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'pay-1',
        bookingId: 'booking-1',
        amount: new Decimal(100),
        status: PaymentStatus.PENDING,
        booking: { id: 'booking-1', status: BookingStatus.PAYMENT_PENDING },
      })
      mockPaymentUpdate.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.SUCCESS,
        tapTransactionId: 'tx-1',
        tapChargeId: 'ch-1',
      })
      ;(mockPrisma.ledgerEntry.findFirst as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.ledgerEntry.create as jest.Mock).mockResolvedValue({ id: 'le-1' })
      const result = await PaymentService.process({
        paymentId: 'pay-1',
        tapTransactionId: 'tx-1',
        tapChargeId: 'ch-1',
        userId: 'u1',
      })
      expect(result.status).toBe(PaymentStatus.SUCCESS)
    })

    it('skips legacy success notifications when PAYMENT_RECEIVED rules are active', async () => {
      ;(hasActiveAutomationRulesForTrigger as jest.Mock).mockResolvedValue(true)
      mockPaymentFindFirst.mockResolvedValue({
        id: 'pay-1',
        bookingId: 'booking-1',
        amount: new Decimal(100),
        status: PaymentStatus.PENDING,
        booking: {
          id: 'booking-1',
          status: BookingStatus.PAYMENT_PENDING,
          customerId: 'customer-1',
          bookingNumber: 'BK-001',
        },
      })
      mockPaymentUpdate.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.SUCCESS,
        tapTransactionId: 'tx-1',
        tapChargeId: 'ch-1',
      })
      ;(mockPrisma.ledgerEntry.findFirst as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.ledgerEntry.create as jest.Mock).mockResolvedValue({ id: 'le-1' })

      await PaymentService.process({
        paymentId: 'pay-1',
        tapTransactionId: 'tx-1',
        tapChargeId: 'ch-1',
        userId: 'u1',
      })

      expect(OrderNotificationService.notifyPaymentConfirmed).not.toHaveBeenCalled()
      expect(OrderNotificationService.notifyPaymentConfirmedExtraEmails).toHaveBeenCalledWith(
        'booking-1',
        100
      )
      expect(EmailService.sendPaymentDocumentsEmail).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when payment not found', async () => {
      mockPaymentFindFirst.mockResolvedValue(null)
      await expect(
        PaymentService.process({
          paymentId: 'missing',
          tapTransactionId: 'tx-1',
          tapChargeId: 'ch-1',
          userId: 'u1',
        })
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('markFailed', () => {
    it('marks payment as failed', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'pay-1',
        bookingId: 'booking-1',
        status: PaymentStatus.PENDING,
        booking: { customerId: 'c1', bookingNumber: 'B001' },
      })
      mockPaymentUpdate.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.FAILED,
      })
      const result = await PaymentService.markFailed('pay-1', 'u1', 'Card declined')
      expect(result.status).toBe(PaymentStatus.FAILED)
    })

    it('throws NotFoundError when payment not found', async () => {
      mockPaymentFindFirst.mockResolvedValue(null)
      await expect(PaymentService.markFailed('missing', 'u1')).rejects.toThrow(NotFoundError)
    })
  })

  describe('requestRefund', () => {
    it('throws ForbiddenError when user lacks refund permission', async () => {
      ;(permissions.hasPermission as jest.Mock).mockResolvedValue(false)
      await expect(
        PaymentService.requestRefund({
          paymentId: 'pay-1',
          reason: 'Test',
          userId: 'u1',
        })
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when payment not found', async () => {
      mockPaymentFindFirst.mockResolvedValue(null)
      await expect(
        PaymentService.requestRefund({
          paymentId: 'missing',
          reason: 'Test',
          userId: 'u1',
        })
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when payment already refunded', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.REFUNDED,
        amount: new Decimal(100),
      })
      await expect(
        PaymentService.requestRefund({
          paymentId: 'pay-1',
          reason: 'Test',
          userId: 'u1',
        })
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when payment not in SUCCESS or PARTIALLY_REFUNDED', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.PENDING,
        amount: new Decimal(100),
      })
      await expect(
        PaymentService.requestRefund({
          paymentId: 'pay-1',
          reason: 'Test',
          userId: 'u1',
        })
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when refund amount exceeds payment amount', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.SUCCESS,
        amount: new Decimal(100),
      })
      await expect(
        PaymentService.requestRefund({
          paymentId: 'pay-1',
          amount: 150,
          reason: 'Test',
          userId: 'u1',
        })
      ).rejects.toThrow(ValidationError)
    })

    it('creates approval request when valid', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.SUCCESS,
        amount: new Decimal(100),
      })
      mockApprovalRequest.mockResolvedValue({
        id: 'apr-1',
        status: 'pending',
        resourceId: 'pay-1',
        reason: 'Test',
        metadata: {},
      })
      const result = await PaymentService.requestRefund({
        paymentId: 'pay-1',
        reason: 'Test',
        userId: 'u1',
      })
      expect(result.payment.id).toBe('pay-1')
      expect(mockApprovalRequest).toHaveBeenCalled()
    })
  })

  describe('processRefund', () => {
    it('throws NotFoundError when payment not found', async () => {
      mockPaymentFindFirst.mockResolvedValue(null)
      await expect(
        PaymentService.processRefund('missing', 'apr-1', 'u1')
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when approval not found or not approved', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.SUCCESS,
        amount: new Decimal(100),
        bookingId: 'b1',
      })
      mockApprovalGetById.mockResolvedValue(null)
      await expect(
        PaymentService.processRefund('pay-1', 'apr-1', 'u1')
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when approval resourceId does not match payment', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.SUCCESS,
        amount: new Decimal(100),
        bookingId: 'b1',
      })
      mockApprovalGetById.mockResolvedValue({
        id: 'apr-1',
        status: 'approved',
        resourceId: 'pay-2',
        reason: 'Test',
        metadata: null,
      })
      await expect(
        PaymentService.processRefund('pay-1', 'apr-1', 'u1')
      ).rejects.toThrow(ValidationError)
    })

    it('processes full refund when approved', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.SUCCESS,
        amount: new Decimal(100),
        bookingId: 'b1',
        gateway: 'tap',
        tapChargeId: 'ch_1',
      })
      mockApprovalGetById.mockResolvedValue({
        id: 'apr-1',
        status: 'approved',
        resourceId: 'pay-1',
        reason: 'Test',
        metadata: null,
      })
      mockTxPaymentUpdate.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.REFUNDED,
        refundAmount: new Decimal(100),
      })
      mockTxRefundCreate.mockResolvedValue({ id: 'r1' })
      mockTxInvoiceFindFirst.mockResolvedValue(null)
      mockTxLedgerEntryCreate.mockResolvedValue({ id: 'le-1' })
      const result = await PaymentService.processRefund('pay-1', 'apr-1', 'u1')
      expect(result.status).toBe(PaymentStatus.REFUNDED)
    })

    it('processes partial refund when metadata has refundAmount', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.SUCCESS,
        amount: new Decimal(100),
        bookingId: 'b1',
        gateway: 'tap',
        tapChargeId: 'ch_1',
      })
      mockApprovalGetById.mockResolvedValue({
        id: 'apr-1',
        status: 'approved',
        resourceId: 'pay-1',
        reason: 'Partial',
        metadata: { refundAmount: '50' },
      })
      mockTxPaymentUpdate.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.PARTIALLY_REFUNDED,
        refundAmount: new Decimal(50),
      })
      mockTxRefundCreate.mockResolvedValue({ id: 'r1' })
      mockTxInvoiceFindFirst.mockResolvedValue(null)
      mockTxLedgerEntryCreate.mockResolvedValue({ id: 'le-1' })
      const result = await PaymentService.processRefund('pay-1', 'apr-1', 'u1')
      expect(result.status).toBe(PaymentStatus.PARTIALLY_REFUNDED)
    })

    it('processes refund with approval.reason undefined uses undefined for refundReason', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.SUCCESS,
        amount: new Decimal(100),
        bookingId: 'b1',
        gateway: 'tap',
        tapChargeId: 'ch_1',
      })
      mockApprovalGetById.mockResolvedValue({
        id: 'apr-1',
        status: 'approved',
        resourceId: 'pay-1',
        reason: null,
        metadata: null,
      })
      mockTxPaymentUpdate.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.REFUNDED,
        refundAmount: new Decimal(100),
      })
      mockTxRefundCreate.mockResolvedValue({ id: 'r1' })
      mockTxInvoiceFindFirst.mockResolvedValue(null)
      mockTxLedgerEntryCreate.mockResolvedValue({ id: 'le-1' })
      const result = await PaymentService.processRefund('pay-1', 'apr-1', 'u1')
      expect(result.status).toBe(PaymentStatus.REFUNDED)
      expect(mockTxPaymentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refundReason: undefined,
          }),
        })
      )
    })
  })

  describe('getById', () => {
    it('returns payment when found', async () => {
      mockPaymentFindFirst.mockResolvedValue({
        id: 'pay-1',
        bookingId: 'booking-1',
        amount: 100,
        status: PaymentStatus.SUCCESS,
        booking: { customer: { id: 'c1', email: 'a@b.com', name: 'Test' } },
      })
      const result = await PaymentService.getById('pay-1', 'u1')
      expect(result.id).toBe('pay-1')
    })

    it('throws ForbiddenError when user lacks permission', async () => {
      ;(permissions.hasPermission as jest.Mock).mockResolvedValue(false)
      await expect(PaymentService.getById('pay-1', 'u1')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when payment not found', async () => {
      mockPaymentFindFirst.mockResolvedValue(null)
      await expect(PaymentService.getById('missing', 'u1')).rejects.toThrow(NotFoundError)
    })
  })

  describe('getByBookingId', () => {
    it('returns payments for booking', async () => {
      mockPaymentFindMany.mockResolvedValue([
        { id: 'pay-1', bookingId: 'booking-1', status: PaymentStatus.SUCCESS },
      ])
      const result = await PaymentService.getByBookingId('booking-1', 'u1')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('pay-1')
    })

    it('throws ForbiddenError when user lacks permission', async () => {
      ;(permissions.hasPermission as jest.Mock).mockResolvedValue(false)
      await expect(PaymentService.getByBookingId('booking-1', 'u1')).rejects.toThrow(ForbiddenError)
    })
  })

  describe('list', () => {
    it('returns paginated payments with summary', async () => {
      mockPaymentFindMany.mockResolvedValue([])
      mockPaymentCount.mockResolvedValue(0)
      mockPaymentAggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { refundAmount: null } })
      const result = await PaymentService.list('u1', {})
      expect(result.payments).toEqual([])
      expect(result.total).toBe(0)
      expect(result.summary).toBeDefined()
    })

    it('applies filters', async () => {
      mockPaymentFindMany.mockResolvedValue([])
      mockPaymentCount.mockResolvedValue(0)
      mockPaymentAggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { refundAmount: null } })
      const result = await PaymentService.list('u1', {
        status: PaymentStatus.SUCCESS,
        bookingId: 'b1',
        customerId: 'c1',
        dateFrom: new Date('2026-01-01'),
        dateTo: new Date('2026-01-31'),
        minAmount: 10,
        maxAmount: 1000,
        hasRefund: true,
        page: 2,
        pageSize: 10,
      })
      expect(result).toBeDefined()
      expect(mockPaymentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PaymentStatus.SUCCESS,
            bookingId: 'b1',
          }),
          skip: 10,
          take: 10,
        })
      )
    })

    it('applies hasRefund false filter', async () => {
      mockPaymentFindMany.mockResolvedValue([])
      mockPaymentCount.mockResolvedValue(0)
      mockPaymentAggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { refundAmount: null } })
      await PaymentService.list('u1', { hasRefund: false })
      expect(mockPaymentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ refundAmount: null }),
        })
      )
    })

    it('maps payments with booking and refundAmount', async () => {
      mockPaymentCount.mockResolvedValueOnce(1).mockResolvedValueOnce(0)
      mockPaymentFindMany.mockResolvedValue([
        {
          id: 'pay-1',
          bookingId: 'b1',
          amount: new Decimal(100),
          status: PaymentStatus.SUCCESS,
          tapTransactionId: 'tx-1',
          tapChargeId: 'ch-1',
          refundAmount: new Decimal(50),
          refundReason: 'Partial',
          booking: {
            id: 'b1',
            bookingNumber: 'B001',
            customerId: 'c1',
            totalAmount: new Decimal(500),
            customer: { id: 'c1', email: 'a@b.com', name: 'Test' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'u1',
          updatedBy: null,
        },
      ])
      mockPaymentCount.mockResolvedValue(1)
      mockPaymentAggregate
        .mockResolvedValueOnce({ _sum: { amount: 100 } })
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { refundAmount: 50 } })
      const result = await PaymentService.list('u1', {})
      expect(result.payments).toHaveLength(1)
      expect(result.payments[0].refundAmount).toBe(50)
      expect(result.payments[0].booking).toMatchObject({
        id: 'b1',
        bookingNumber: 'B001',
        customerId: 'c1',
        totalPrice: 500,
      })
    })

    it('maps payment with null booking when booking is missing', async () => {
      mockPaymentCount.mockResolvedValue(1)
      mockPaymentFindMany.mockResolvedValue([
        {
          id: 'pay-orphan',
          bookingId: 'deleted-b1',
          amount: new Decimal(200),
          status: PaymentStatus.SUCCESS,
          tapTransactionId: null,
          tapChargeId: null,
          refundAmount: null,
          refundReason: null,
          booking: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'u1',
          updatedBy: null,
        },
      ])
      mockPaymentAggregate
        .mockResolvedValueOnce({ _sum: { amount: 200 } })
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { refundAmount: null } })
      const result = await PaymentService.list('u1', {})
      expect(result.payments).toHaveLength(1)
      expect(result.payments[0].id).toBe('pay-orphan')
      expect(result.payments[0].booking).toBeNull()
    })

    it('throws ForbiddenError when user lacks permission', async () => {
      ;(permissions.hasPermission as jest.Mock).mockResolvedValue(false)
      await expect(PaymentService.list('u1')).rejects.toThrow(ForbiddenError)
    })
  })

  describe('handleGatewayWebhook', () => {
    /** 217.39 + 32.61 = 250.00 SAR → 25000 halalah (matches Moyasar webhook `amount`) */
    const moyasarBookingTotals = { totalAmount: 217.39, vatAmount: 32.61 }

    it('creates success payment for payment_paid events', async () => {
      ;(mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'b1',
        status: BookingStatus.PAYMENT_PENDING,
        customerId: 'c1',
        ...moyasarBookingTotals,
      })
      mockPaymentFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
      mockPaymentCreate.mockResolvedValue({
        id: 'pay-1',
        bookingId: 'b1',
        amount: new Decimal(250),
        status: PaymentStatus.SUCCESS,
        tapTransactionId: null,
        tapChargeId: null,
      })

      await PaymentService.handleGatewayWebhook('moyasar', {
        type: 'payment_paid',
        bookingId: 'b1',
        amount: 25000,
        externalId: 'moy_1',
      })

      expect(mockPaymentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bookingId: 'b1',
            status: PaymentStatus.SUCCESS,
          }),
        })
      )
    })

    it('maps payment_authorized events to PROCESSING', async () => {
      ;(mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'b1',
        status: BookingStatus.PAYMENT_PENDING,
        customerId: 'c1',
        ...moyasarBookingTotals,
      })
      mockPaymentFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
      mockPaymentCreate.mockResolvedValue({
        id: 'pay-2',
        bookingId: 'b1',
        amount: new Decimal(250),
        status: PaymentStatus.PROCESSING,
      })

      await PaymentService.handleGatewayWebhook('moyasar', {
        type: 'payment_authorized',
        bookingId: 'b1',
        amount: 25000,
        externalId: 'moy_2',
      })

      expect(mockPaymentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PaymentStatus.PROCESSING,
          }),
        })
      )
    })

    it('updates existing payment status for refund events', async () => {
      ;(mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'b1',
        status: BookingStatus.CONFIRMED,
        customerId: 'c1',
        ...moyasarBookingTotals,
      })
      mockPaymentFindFirst.mockResolvedValueOnce({
        id: 'pay-3',
        bookingId: 'b1',
        amount: new Decimal(250),
        status: PaymentStatus.SUCCESS,
        tapTransactionId: 'moy_3',
        tapChargeId: null,
      })
      mockPaymentUpdate.mockResolvedValue({
        id: 'pay-3',
        status: PaymentStatus.REFUNDED,
      })

      await PaymentService.handleGatewayWebhook('moyasar', {
        type: 'payment_refunded',
        bookingId: 'b1',
        amount: 25000,
        externalId: 'moy_3',
      })

      expect(mockPaymentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PaymentStatus.REFUNDED,
          }),
        })
      )
    })

    it('reconciles metadata for duplicate success webhook events without creating a new payment', async () => {
      ;(mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'b1',
        status: BookingStatus.CONFIRMED,
        customerId: 'c1',
        ...moyasarBookingTotals,
      })
      mockPaymentFindFirst.mockResolvedValueOnce({
        id: 'pay-4',
        bookingId: 'b1',
        amount: new Decimal(250),
        status: PaymentStatus.SUCCESS,
        tapTransactionId: 'moy_4',
        tapChargeId: null,
      })

      await PaymentService.handleGatewayWebhook('moyasar', {
        type: 'payment_paid',
        bookingId: 'b1',
        amount: 25000,
        externalId: 'moy_4',
      })

      expect(mockPaymentCreate).not.toHaveBeenCalled()
      expect(mockPaymentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PaymentStatus.SUCCESS,
            externalId: 'moy_4',
          }),
        })
      )
    })

    it('throws when Moyasar paid halalah does not match booking grand total', async () => {
      ;(mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'b1',
        status: BookingStatus.PAYMENT_PENDING,
        customerId: 'c1',
        ...moyasarBookingTotals,
      })

      await expect(
        PaymentService.handleGatewayWebhook('moyasar', {
          type: 'payment_paid',
          bookingId: 'b1',
          amount: 100,
          externalId: 'moy_wrong_amount',
        })
      ).rejects.toThrow(/amount mismatch/)
    })
  })

  describe('verifyWebhookSignature', () => {
    const originalEnv = process.env
    afterEach(() => {
      process.env = originalEnv
    })

    it('returns false when TAP_SECRET_KEY is not set', async () => {
      delete process.env.TAP_SECRET_KEY
      const result = await PaymentService.verifyWebhookSignature('payload', 'sig')
      expect(result).toBe(false)
    })

    it('returns true when signature matches', async () => {
      process.env.TAP_SECRET_KEY = 'secret'
      const crypto = await import('crypto')
      const expected = crypto.createHmac('sha256', 'secret').update('payload').digest('hex')
      const result = await PaymentService.verifyWebhookSignature('payload', expected)
      expect(result).toBe(true)
    })

    it('returns false when signature does not match', async () => {
      process.env.TAP_SECRET_KEY = 'secret'
      const result = await PaymentService.verifyWebhookSignature('payload', 'wrong-sig')
      expect(result).toBe(false)
    })

    it('returns false when signature length differs from expected', async () => {
      process.env.TAP_SECRET_KEY = 'secret'
      const result = await PaymentService.verifyWebhookSignature('payload', 'short')
      expect(result).toBe(false)
    })

    it('returns false when signature has same length but wrong content', async () => {
      process.env.TAP_SECRET_KEY = 'secret'
      const wrongSig = 'a'.repeat(64)
      const result = await PaymentService.verifyWebhookSignature('payload', wrongSig)
      expect(result).toBe(false)
    })
  })
})
