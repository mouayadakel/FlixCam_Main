/**
 * Unit tests for quote.service
 * PATHS: create (permission, dates, equipment, success); getById (permission, not found, expired);
 * list; update; delete; convertToBooking; addQuoteToCart
 */

import { QuoteService } from '../quote.service'
import { prisma } from '@/lib/db/prisma'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    quote: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    equipment: { findMany: jest.fn() },
    quoteEquipment: { createMany: jest.fn(), deleteMany: jest.fn() },
    cart: { findFirst: jest.fn() },
    kitEquipment: { findMany: jest.fn() },
  },
}))

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

jest.mock('../pricing.service', () => ({
  PricingService: {
    generateQuote: jest.fn().mockResolvedValue({
      subtotal: 100,
      vatAmount: 15,
      totalAmount: 115,
      depositAmount: 50,
    }),
  },
}))

jest.mock('../audit.service', () => ({
  AuditService: { log: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock('@/lib/events/event-bus', () => ({
  EventBus: { emit: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock('../booking.service', () => ({
  BookingService: { create: jest.fn().mockResolvedValue({ id: 'bk_1', bookingNumber: 'B001' }) },
}))

jest.mock('../cart.service', () => ({
  CartService: {
    addQuoteToCart: jest.fn().mockResolvedValue({}),
    getOrCreateCart: jest.fn().mockResolvedValue({ id: 'cart1' }),
    addItem: jest.fn().mockResolvedValue({}),
  },
}))

const mockQuoteFindFirst = prisma.quote.findFirst as jest.Mock
const mockQuoteFindMany = prisma.quote.findMany as jest.Mock
const mockQuoteCreate = prisma.quote.create as jest.Mock
const mockQuoteUpdate = prisma.quote.update as jest.Mock
const mockQuoteCount = prisma.quote.count as jest.Mock
const mockEquipmentFindMany = prisma.equipment.findMany as jest.Mock
const mockQuoteEquipmentCreateMany = prisma.quoteEquipment.createMany as jest.Mock
const mockQuoteEquipmentDeleteMany = prisma.quoteEquipment.deleteMany as jest.Mock
const mockCartFindFirst = prisma.cart.findFirst as jest.Mock
const mockKitEquipmentFindMany = prisma.kitEquipment.findMany as jest.Mock
const hasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock
const PricingService = require('../pricing.service').PricingService

const baseQuote = {
  id: 'q1',
  quoteNumber: 'QT-ABC-123',
  customerId: 'c1',
  status: 'DRAFT',
  startDate: new Date('2026-03-01'),
  endDate: new Date('2026-03-05'),
  validUntil: new Date('2026-04-01'),
  subtotal: 100,
  vatAmount: 15,
  totalAmount: 115,
  equipment: [{ equipmentId: 'e1', quantity: 1, dailyRate: 20, totalDays: 4, subtotal: 80 }],
  equipmentItems: [
    { equipmentId: 'e1', quantity: 1, dailyRate: 20, totalDays: 4, subtotal: 80 },
  ],
  customer: { id: 'c1', name: 'Customer', email: 'c@test.com', taxId: null, companyName: null, billingAddress: null },
  studio: null,
  booking: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('QuoteService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    hasPermission.mockResolvedValue(true)
  })

  describe('create', () => {
    it('throws ForbiddenError when user lacks quote.create', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        QuoteService.create(
          {
            customerId: 'c1',
            startDate: new Date('2026-03-01'),
            endDate: new Date('2026-03-05'),
            equipment: [{ equipmentId: 'e1', quantity: 1 }],
          },
          'user_1'
        )
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws ValidationError when endDate <= startDate', async () => {
      mockEquipmentFindMany.mockResolvedValue([{ id: 'e1', dailyPrice: 20 }])
      await expect(
        QuoteService.create(
          {
            customerId: 'c1',
            startDate: new Date('2026-03-05'),
            endDate: new Date('2026-03-01'),
            equipment: [{ equipmentId: 'e1', quantity: 1 }],
          },
          'user_1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when equipment not found', async () => {
      mockEquipmentFindMany.mockResolvedValue([])
      await expect(
        QuoteService.create(
          {
            customerId: 'c1',
            startDate: new Date('2026-03-01'),
            endDate: new Date('2026-03-05'),
            equipment: [{ equipmentId: 'e1', quantity: 1 }],
          },
          'user_1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('retries generateQuoteNumber when collision occurs', async () => {
      mockEquipmentFindMany.mockResolvedValue([{ id: 'e1', dailyPrice: 20 }])
      mockQuoteFindFirst
        .mockResolvedValueOnce({ id: 'existing' })
        .mockResolvedValueOnce(null)
      mockQuoteCreate.mockResolvedValue({
        ...baseQuote,
        equipmentItems: [],
        equipment: baseQuote.equipment,
      })
      mockQuoteEquipmentCreateMany.mockResolvedValue({ count: 1 })
      const result = await QuoteService.create(
        {
          customerId: 'c1',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-05'),
          equipment: [{ equipmentId: 'e1', quantity: 1 }],
        },
        'user_1'
      )
      expect(result).toBeDefined()
      expect(mockQuoteFindFirst).toHaveBeenCalled()
    })

    it('creates quote and returns transformed result', async () => {
      mockEquipmentFindMany.mockResolvedValue([{ id: 'e1', dailyPrice: 20 }])
      mockQuoteFindFirst.mockResolvedValue(null)
      mockQuoteCreate.mockResolvedValue({
        ...baseQuote,
        equipmentItems: [],
        equipment: baseQuote.equipment,
      })
      mockQuoteEquipmentCreateMany.mockResolvedValue({ count: 1 })

      const result = await QuoteService.create(
        {
          customerId: 'c1',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-05'),
          equipment: [{ equipmentId: 'e1', quantity: 1 }],
        },
        'user_1'
      )

      expect(result).toMatchObject({
        id: 'q1',
        quoteNumber: 'QT-ABC-123',
        status: 'draft',
        customerId: 'c1',
      })
      expect(mockQuoteCreate).toHaveBeenCalledTimes(1)
      expect(mockQuoteEquipmentCreateMany).toHaveBeenCalledTimes(1)
    })

    it('creates quote with notes and discount', async () => {
      mockEquipmentFindMany.mockResolvedValue([{ id: 'e1', dailyPrice: 20 }])
      mockQuoteFindFirst.mockResolvedValue(null)
      mockQuoteCreate.mockResolvedValue({
        ...baseQuote,
        equipmentItems: [],
        equipment: baseQuote.equipment,
        notes: 'Rush order',
        discount: 10,
      })
      mockQuoteEquipmentCreateMany.mockResolvedValue({ count: 1 })

      await QuoteService.create(
        {
          customerId: 'c1',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-05'),
          equipment: [{ equipmentId: 'e1', quantity: 1 }],
          notes: 'Rush order',
          discount: 10,
        },
        'user_1'
      )

      expect(mockQuoteCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'Rush order',
            discount: expect.anything(),
          }),
        })
      )
    })

    it('creates quote when equipment dailyPrice is 0 (uses 0 for dailyRate)', async () => {
      mockEquipmentFindMany.mockResolvedValue([{ id: 'e1', dailyPrice: 0 }])
      mockQuoteFindFirst.mockResolvedValue(null)
      mockQuoteCreate.mockResolvedValue({
        ...baseQuote,
        equipmentItems: [],
        equipment: baseQuote.equipment,
      })
      mockQuoteEquipmentCreateMany.mockResolvedValue({ count: 1 })

      await QuoteService.create(
        {
          customerId: 'c1',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-05'),
          equipment: [{ equipmentId: 'e1', quantity: 1 }],
        },
        'user_1'
      )

      expect(mockQuoteCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            equipment: expect.arrayContaining([
              expect.objectContaining({ dailyRate: 0, subtotal: 0 }),
            ]),
          }),
        })
      )
    })

    it('creates quote when pricing returns no depositAmount', async () => {
      mockEquipmentFindMany.mockResolvedValue([{ id: 'e1', dailyPrice: 20 }])
      mockQuoteFindFirst.mockResolvedValue(null)
      PricingService.generateQuote.mockResolvedValue({
        subtotal: 100,
        vatAmount: 15,
        totalAmount: 115,
        depositAmount: undefined,
      })
      mockQuoteCreate.mockResolvedValue({
        ...baseQuote,
        equipmentItems: [],
        equipment: baseQuote.equipment,
        depositAmount: null,
      })
      mockQuoteEquipmentCreateMany.mockResolvedValue({ count: 1 })

      await QuoteService.create(
        {
          customerId: 'c1',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-05'),
          equipment: [{ equipmentId: 'e1', quantity: 1 }],
        },
        'user_1'
      )

      expect(mockQuoteCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            depositAmount: null,
          }),
        })
      )
    })

    it('creates quote with validUntil, studioId, studioStartTime, studioEndTime', async () => {
      const customValidUntil = new Date('2026-05-01')
      mockEquipmentFindMany.mockResolvedValue([{ id: 'e1', dailyPrice: 20 }])
      mockQuoteFindFirst.mockResolvedValue(null)
      mockQuoteCreate.mockResolvedValue({
        ...baseQuote,
        equipmentItems: [],
        equipment: baseQuote.equipment,
      })
      mockQuoteEquipmentCreateMany.mockResolvedValue({ count: 1 })

      await QuoteService.create(
        {
          customerId: 'c1',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-05'),
          equipment: [{ equipmentId: 'e1', quantity: 1 }],
          validUntil: customValidUntil,
          studioId: 'studio1',
          studioStartTime: new Date('2026-03-01T09:00:00'),
          studioEndTime: new Date('2026-03-01T18:00:00'),
        },
        'user_1'
      )

      expect(mockQuoteCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            validUntil: customValidUntil,
            studioId: 'studio1',
            studioStartTime: expect.any(Date),
            studioEndTime: expect.any(Date),
          }),
        })
      )
    })
  })

  describe('getById', () => {
    it('throws ForbiddenError when user lacks quote.read', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(QuoteService.getById('q1', 'user_1')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when quote not found', async () => {
      mockQuoteFindFirst.mockResolvedValue(null)
      await expect(QuoteService.getById('missing', 'user_1')).rejects.toThrow(NotFoundError)
    })

    it('returns quote when found', async () => {
      mockQuoteFindFirst.mockResolvedValue(baseQuote)
      const result = await QuoteService.getById('q1', 'user_1')
      expect(result).toMatchObject({ id: 'q1', status: 'draft' })
    })

    it('auto-updates status to EXPIRED when validUntil passed', async () => {
      const expiredQuote = {
        ...baseQuote,
        validUntil: new Date('2020-01-01'),
        status: 'SENT',
      }
      mockQuoteFindFirst.mockResolvedValue(expiredQuote)
      mockQuoteUpdate.mockResolvedValue({ ...expiredQuote, status: 'EXPIRED' })
      const result = await QuoteService.getById('q1', 'user_1')
      expect(mockQuoteUpdate).toHaveBeenCalledWith({
        where: { id: 'q1' },
        data: { status: 'EXPIRED' },
      })
      expect(result.status).toBe('expired')
    })
  })

  describe('list', () => {
    it('throws ForbiddenError when user lacks quote.read', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(QuoteService.list('user_1')).rejects.toThrow(ForbiddenError)
    })

    it('returns quotes and total', async () => {
      mockQuoteFindMany.mockResolvedValue([baseQuote])
      mockQuoteCount.mockResolvedValue(1)
      const result = await QuoteService.list('user_1')
      expect(result.quotes).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
    })

    it('applies status, customerId, dateFrom, dateTo filters', async () => {
      mockQuoteFindMany.mockResolvedValue([])
      mockQuoteCount.mockResolvedValue(0)
      await QuoteService.list('user_1', {
        status: 'sent',
        customerId: 'c1',
        dateFrom: new Date('2026-01-01'),
        dateTo: new Date('2026-12-31'),
      })
      expect(mockQuoteFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'SENT',
            customerId: 'c1',
            startDate: { gte: expect.any(Date), lte: expect.any(Date) },
          }),
        })
      )
    })

    it('maps unknown status filter to DRAFT fallback', async () => {
      mockQuoteFindMany.mockResolvedValue([])
      mockQuoteCount.mockResolvedValue(0)
      await QuoteService.list('user_1', {
        status: 'unknown_status' as any,
      })
      expect(mockQuoteFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'DRAFT' }),
        })
      )
    })
  })

  describe('update', () => {
    it('throws ForbiddenError when user lacks quote.update', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        QuoteService.update('q1', { notes: 'Updated' }, 'user_1')
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when quote not found', async () => {
      mockQuoteFindFirst.mockResolvedValue(null)
      await expect(
        QuoteService.update('missing', { notes: 'x' }, 'user_1')
      ).rejects.toThrow(NotFoundError)
    })

    it('updates quote when valid', async () => {
      mockQuoteFindFirst.mockResolvedValue(baseQuote)
      mockQuoteUpdate.mockResolvedValue({ ...baseQuote, notes: 'Updated' })
      const result = await QuoteService.update('q1', { notes: 'Updated' }, 'user_1')
      expect(result).toBeDefined()
      expect(mockQuoteUpdate).toHaveBeenCalled()
    })

    it('recalculates pricing when equipment or dates change', async () => {
      const quoteWithItems = {
        ...baseQuote,
        equipmentItems: [{ equipmentId: 'e1', quantity: 1, equipment: { id: 'e1', dailyPrice: 20 } }],
      }
      mockQuoteFindFirst.mockResolvedValue(quoteWithItems)
      mockEquipmentFindMany.mockResolvedValue([{ id: 'e1', dailyPrice: 25 }])
      PricingService.generateQuote.mockResolvedValue({
        subtotal: 125,
        vatAmount: 18.75,
        totalAmount: 143.75,
        depositAmount: 60,
      })
      mockQuoteUpdate.mockResolvedValue({ ...quoteWithItems, totalAmount: 143.75 })
      mockQuoteEquipmentDeleteMany.mockResolvedValue({})
      mockQuoteEquipmentCreateMany.mockResolvedValue({ count: 1 })
      const result = await QuoteService.update(
        'q1',
        {
          equipment: [{ equipmentId: 'e1', quantity: 2 }],
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-10'),
        },
        'user_1'
      )
      expect(result).toBeDefined()
      expect(PricingService.generateQuote).toHaveBeenCalled()
      expect(mockQuoteEquipmentDeleteMany).toHaveBeenCalled()
      expect(mockQuoteEquipmentCreateMany).toHaveBeenCalled()
    })

    it('recalculates when only dates change using existing equipment', async () => {
      const quoteWithItems = {
        ...baseQuote,
        equipmentItems: [{ equipmentId: 'e1', quantity: 1, equipment: { id: 'e1', dailyPrice: 20 } }],
      }
      mockQuoteFindFirst.mockResolvedValue(quoteWithItems)
      PricingService.generateQuote.mockResolvedValue({
        subtotal: 80,
        vatAmount: 12,
        totalAmount: 92,
        depositAmount: 40,
      })
      mockQuoteUpdate.mockResolvedValue({ ...quoteWithItems })
      const result = await QuoteService.update(
        'q1',
        { startDate: new Date('2026-03-01'), endDate: new Date('2026-03-05') },
        'user_1'
      )
      expect(result).toBeDefined()
      expect(PricingService.generateQuote).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment: [{ equipmentId: 'e1', quantity: 1 }],
        })
      )
    })

    it('applies discount when provided on update with equipment change', async () => {
      const quoteWithItems = {
        ...baseQuote,
        equipmentItems: [{ equipmentId: 'e1', quantity: 1, equipment: { id: 'e1', dailyPrice: 20 } }],
      }
      mockQuoteFindFirst.mockResolvedValue(quoteWithItems)
      mockEquipmentFindMany.mockResolvedValue([{ id: 'e1', dailyPrice: 20 }])
      PricingService.generateQuote.mockResolvedValue({
        subtotal: 100,
        vatAmount: 15,
        totalAmount: 115,
        depositAmount: 50,
      })
      mockQuoteUpdate.mockResolvedValue({ ...quoteWithItems })
      mockQuoteEquipmentDeleteMany.mockResolvedValue({})
      mockQuoteEquipmentCreateMany.mockResolvedValue({ count: 1 })
      const result = await QuoteService.update(
        'q1',
        { equipment: [{ equipmentId: 'e1', quantity: 1 }], discount: 10 },
        'user_1'
      )
      expect(result).toBeDefined()
      expect(mockQuoteUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            discount: expect.anything(),
          }),
        })
      )
    })

    it('updates without discount when discount not provided (uses pricing totals)', async () => {
      const quoteWithItems = {
        ...baseQuote,
        equipmentItems: [{ equipmentId: 'e1', quantity: 1, equipment: { id: 'e1', dailyPrice: 20 } }],
      }
      mockQuoteFindFirst.mockResolvedValue(quoteWithItems)
      mockEquipmentFindMany.mockResolvedValue([{ id: 'e1', dailyPrice: 20 }])
      PricingService.generateQuote.mockResolvedValue({
        subtotal: 80,
        vatAmount: 12,
        totalAmount: 92,
        depositAmount: 40,
      })
      mockQuoteUpdate.mockResolvedValue({ ...quoteWithItems })
      mockQuoteEquipmentDeleteMany.mockResolvedValue({})
      mockQuoteEquipmentCreateMany.mockResolvedValue({ count: 1 })
      const result = await QuoteService.update(
        'q1',
        { equipment: [{ equipmentId: 'e1', quantity: 1 }], startDate: new Date('2026-03-01'), endDate: new Date('2026-03-05') },
        'user_1'
      )
      expect(result).toBeDefined()
      expect(mockQuoteUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: expect.anything(),
            totalAmount: expect.anything(),
          }),
        })
      )
    })

    it('preserves studio fields when not provided on update', async () => {
      const quoteWithStudio = {
        ...baseQuote,
        studioId: 'studio1',
        studioStartTime: '09:00',
        studioEndTime: '18:00',
        equipmentItems: [{ equipmentId: 'e1', quantity: 1, equipment: { id: 'e1', dailyPrice: 20 } }],
      }
      mockQuoteFindFirst.mockResolvedValue(quoteWithStudio)
      PricingService.generateQuote.mockResolvedValue({
        subtotal: 80,
        vatAmount: 12,
        totalAmount: 92,
        depositAmount: 40,
      })
      mockQuoteUpdate.mockResolvedValue({ ...quoteWithStudio })
      await QuoteService.update(
        'q1',
        { startDate: new Date('2026-03-01'), endDate: new Date('2026-03-05') },
        'user_1'
      )
      expect(mockQuoteUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            studioId: 'studio1',
            studioStartTime: '09:00',
            studioEndTime: '18:00',
          }),
        })
      )
    })

    it('overwrites studio fields when provided on update', async () => {
      const quoteWithStudio = {
        ...baseQuote,
        studioId: 'studio1',
        studioStartTime: '09:00',
        studioEndTime: '18:00',
        equipmentItems: [{ equipmentId: 'e1', quantity: 1, equipment: { id: 'e1', dailyPrice: 20 } }],
      }
      mockQuoteFindFirst.mockResolvedValue(quoteWithStudio)
      PricingService.generateQuote.mockResolvedValue({
        subtotal: 80,
        vatAmount: 12,
        totalAmount: 92,
        depositAmount: 40,
      })
      mockQuoteUpdate.mockResolvedValue({ ...quoteWithStudio })
      await QuoteService.update(
        'q1',
        {
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-05'),
          studioId: 'studio2',
          studioStartTime: new Date('2026-03-01T10:00:00'),
          studioEndTime: new Date('2026-03-01T19:00:00'),
        },
        'user_1'
      )
      expect(mockQuoteUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            studioId: 'studio2',
            studioStartTime: new Date('2026-03-01T10:00:00'),
            studioEndTime: new Date('2026-03-01T19:00:00'),
          }),
        })
      )
    })

    it('updates quote with multiple equipment items', async () => {
      const quoteWithItems = {
        ...baseQuote,
        equipmentItems: [
          { equipmentId: 'e1', quantity: 1, equipment: { id: 'e1', dailyPrice: 20 } },
          { equipmentId: 'e2', quantity: 1, equipment: { id: 'e2', dailyPrice: 30 } },
        ],
      }
      mockQuoteFindFirst.mockResolvedValue(quoteWithItems)
      mockEquipmentFindMany.mockResolvedValue([
        { id: 'e1', dailyPrice: 20 },
        { id: 'e2', dailyPrice: 30 },
      ])
      PricingService.generateQuote.mockResolvedValue({
        subtotal: 150,
        vatAmount: 22.5,
        totalAmount: 172.5,
        depositAmount: 75,
      })
      mockQuoteUpdate.mockResolvedValue({ ...quoteWithItems })
      mockQuoteEquipmentDeleteMany.mockResolvedValue({})
      mockQuoteEquipmentCreateMany.mockResolvedValue({ count: 2 })
      const result = await QuoteService.update(
        'q1',
        {
          equipment: [
            { equipmentId: 'e1', quantity: 1 },
            { equipmentId: 'e2', quantity: 1 },
          ],
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-05'),
        },
        'user_1'
      )
      expect(result).toBeDefined()
      expect(mockQuoteEquipmentCreateMany).toHaveBeenCalled()
    })

    it('throws ValidationError when equipment not found on update', async () => {
      const quoteWithItems = {
        ...baseQuote,
        equipmentItems: [{ equipmentId: 'e1', quantity: 1, equipment: {} }],
      }
      mockQuoteFindFirst.mockResolvedValue(quoteWithItems)
      mockEquipmentFindMany.mockResolvedValue([])
      await expect(
        QuoteService.update('q1', { equipment: [{ equipmentId: 'e1', quantity: 1 }] }, 'user_1')
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('delete', () => {
    it('throws ForbiddenError when user lacks quote.delete', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(QuoteService.delete('q1', 'user_1')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when quote not found', async () => {
      mockQuoteFindFirst.mockResolvedValue(null)
      await expect(QuoteService.delete('missing', 'user_1')).rejects.toThrow(NotFoundError)
    })

    it('soft-deletes quote when valid', async () => {
      mockQuoteFindFirst.mockResolvedValue(baseQuote)
      mockQuoteUpdate.mockResolvedValue({ ...baseQuote, deletedAt: new Date() })
      await QuoteService.delete('q1', 'user_1')
      expect(mockQuoteUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
    })
  })

  describe('convertToBooking', () => {
    const BookingService = require('../booking.service').BookingService as { create: jest.Mock }

    it('throws ForbiddenError when user lacks quote.convert', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(QuoteService.convertToBooking('q1', 'user_1')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when quote not found', async () => {
      mockQuoteFindFirst.mockResolvedValue(null)
      await expect(QuoteService.convertToBooking('missing', 'user_1')).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when quote status invalid for conversion', async () => {
      mockQuoteFindFirst.mockResolvedValue({ ...baseQuote, status: 'CONVERTED' })
      await expect(QuoteService.convertToBooking('q1', 'user_1')).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when quote expired', async () => {
      mockQuoteFindFirst.mockResolvedValue({
        ...baseQuote,
        status: 'SENT',
        validUntil: new Date('2020-01-01'),
        equipmentItems: [{ equipmentId: 'e1', quantity: 1, equipment: {} }],
      })
      await expect(QuoteService.convertToBooking('q1', 'user_1')).rejects.toThrow(ValidationError)
    })

    it('converts quote to booking successfully', async () => {
      const quoteWithItems = {
        ...baseQuote,
        status: 'SENT',
        validUntil: new Date('2027-01-01'),
        equipmentItems: [{ equipmentId: 'e1', quantity: 1, equipment: {} }],
      }
      mockQuoteFindFirst.mockResolvedValue(quoteWithItems)
      mockQuoteUpdate.mockResolvedValue({})
      BookingService.create.mockResolvedValue({ id: 'bk_1', bookingNumber: 'B001' })

      const result = await QuoteService.convertToBooking('q1', 'user_1')

      expect(result).toMatchObject({ id: 'bk_1', bookingNumber: 'B001' })
      expect(BookingService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'c1',
          equipment: [{ equipmentId: 'e1', quantity: 1 }],
        }),
        'user_1',
        undefined
      )
      expect(mockQuoteUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q1' },
          data: expect.objectContaining({ status: 'CONVERTED', bookingId: 'bk_1' }),
        })
      )
    })
  })

  describe('updateStatus', () => {
    it('throws ForbiddenError when user lacks quote.update', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        QuoteService.updateStatus('q1', 'accepted', 'user_1')
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when quote not found', async () => {
      mockQuoteFindFirst.mockResolvedValue(null)
      await expect(
        QuoteService.updateStatus('missing', 'accepted', 'user_1')
      ).rejects.toThrow(NotFoundError)
    })

    it('updates quote status successfully', async () => {
      const updatedQuote = { ...baseQuote, status: 'ACCEPTED' }
      mockQuoteFindFirst.mockResolvedValue(baseQuote)
      mockQuoteUpdate.mockResolvedValue(updatedQuote)

      const result = await QuoteService.updateStatus('q1', 'accepted', 'user_1')

      expect(result).toMatchObject({ status: 'accepted' })
      expect(mockQuoteUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q1' },
          data: expect.objectContaining({ status: 'ACCEPTED', updatedBy: 'user_1' }),
        })
      )
    })
  })

  describe('addQuoteToCart', () => {
    const CartService = require('../cart.service').CartService as {
      getOrCreateCart: jest.Mock
      addItem: jest.Mock
    }

    it('throws NotFoundError when quote not found', async () => {
      mockQuoteFindFirst.mockResolvedValue(null)
      await expect(QuoteService.addQuoteToCart('missing', 'user_1')).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError when user is not quote customer', async () => {
      mockQuoteFindFirst.mockResolvedValue({ ...baseQuote, customerId: 'c1' })
      await expect(QuoteService.addQuoteToCart('q1', 'other_user')).rejects.toThrow(ForbiddenError)
    })

    it('throws ValidationError when quote status invalid for cart', async () => {
      mockQuoteFindFirst.mockResolvedValue({
        ...baseQuote,
        customerId: 'user_1',
        status: 'REJECTED',
        validUntil: new Date('2027-01-01'),
      })
      await expect(QuoteService.addQuoteToCart('q1', 'user_1')).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when quote expired', async () => {
      mockQuoteFindFirst.mockResolvedValue({
        ...baseQuote,
        customerId: 'user_1',
        status: 'SENT',
        validUntil: new Date('2020-01-01'),
      })
      await expect(QuoteService.addQuoteToCart('q1', 'user_1')).rejects.toThrow(ValidationError)
    })

    it('adds quote to cart successfully', async () => {
      const quoteWithItems = {
        ...baseQuote,
        customerId: 'user_1',
        status: 'SENT',
        validUntil: new Date('2027-01-01'),
        equipmentItems: [
          {
            equipmentId: 'e1',
            quantity: 1,
            equipment: { dailyPrice: 20 },
            dailyRate: 20,
          },
        ],
      }
      mockQuoteFindFirst.mockResolvedValue(quoteWithItems)
      mockQuoteUpdate.mockResolvedValue({})
      CartService.getOrCreateCart.mockResolvedValue({ id: 'cart1' })
      CartService.addItem.mockResolvedValue({})

      const result = await QuoteService.addQuoteToCart('q1', 'user_1')

      expect(result).toMatchObject({ cart: { id: 'cart1' } })
      expect(CartService.getOrCreateCart).toHaveBeenCalled()
      expect(CartService.addItem).toHaveBeenCalled()
      expect(mockQuoteUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q1' },
          data: expect.objectContaining({ cartId: 'cart1' }),
        })
      )
    })

    it('uses dailyRate fallback when equipment dailyPrice is null', async () => {
      const quoteWithItems = {
        ...baseQuote,
        customerId: 'user_1',
        status: 'SENT',
        validUntil: new Date('2027-01-01'),
        equipmentItems: [
          {
            equipmentId: 'e1',
            quantity: 1,
            equipment: null,
            dailyRate: 25,
          },
        ],
      }
      mockQuoteFindFirst.mockResolvedValue(quoteWithItems)
      mockQuoteUpdate.mockResolvedValue({})
      CartService.getOrCreateCart.mockResolvedValue({ id: 'cart1' })
      CartService.addItem.mockResolvedValue({})

      await QuoteService.addQuoteToCart('q1', 'user_1')

      expect(CartService.addItem).toHaveBeenCalledWith(
        'cart1',
        expect.objectContaining({ dailyRate: 25 })
      )
    })

    it('uses dailyRate fallback when equipment exists but dailyPrice is null', async () => {
      const quoteWithItems = {
        ...baseQuote,
        customerId: 'user_1',
        status: 'SENT',
        validUntil: new Date('2027-01-01'),
        equipmentItems: [
          {
            equipmentId: 'e1',
            quantity: 1,
            equipment: { dailyPrice: null },
            dailyRate: 30,
          },
        ],
      }
      mockQuoteFindFirst.mockResolvedValue(quoteWithItems)
      mockQuoteUpdate.mockResolvedValue({})
      CartService.getOrCreateCart.mockResolvedValue({ id: 'cart1' })
      CartService.addItem.mockResolvedValue({})

      await QuoteService.addQuoteToCart('q1', 'user_1')

      expect(CartService.addItem).toHaveBeenCalledWith(
        'cart1',
        expect.objectContaining({ dailyRate: 30 })
      )
    })

    it('uses 0 when both equipment and dailyRate are null/undefined', async () => {
      const quoteWithItems = {
        ...baseQuote,
        customerId: 'user_1',
        status: 'SENT',
        validUntil: new Date('2027-01-01'),
        equipmentItems: [
          {
            equipmentId: 'e1',
            quantity: 1,
            equipment: null,
            dailyRate: null,
          },
        ],
      }
      mockQuoteFindFirst.mockResolvedValue(quoteWithItems)
      mockQuoteUpdate.mockResolvedValue({})
      CartService.getOrCreateCart.mockResolvedValue({ id: 'cart1' })
      CartService.addItem.mockResolvedValue({})

      await QuoteService.addQuoteToCart('q1', 'user_1')

      expect(CartService.addItem).toHaveBeenCalledWith(
        'cart1',
        expect.objectContaining({ dailyRate: 0 })
      )
    })
  })

  describe('createQuoteFromCart', () => {
    it('throws ForbiddenError when user lacks quote.create', async () => {
      hasPermission.mockResolvedValue(false)
      mockCartFindFirst.mockResolvedValue({ id: 'cart1', userId: 'c1', items: [] })
      await expect(QuoteService.createQuoteFromCart('cart1', 'user_1')).rejects.toThrow(
        ForbiddenError
      )
    })

    it('throws NotFoundError when cart not found', async () => {
      mockCartFindFirst.mockResolvedValue(null)
      await expect(QuoteService.createQuoteFromCart('missing', 'user_1')).rejects.toThrow(
        NotFoundError
      )
    })

    it('throws ValidationError when cart has no userId', async () => {
      mockCartFindFirst.mockResolvedValue({
        id: 'cart1',
        userId: null,
        items: [{ itemType: 'EQUIPMENT', equipmentId: 'e1', quantity: 1 }],
      })
      await expect(QuoteService.createQuoteFromCart('cart1', 'user_1')).rejects.toThrow(
        ValidationError
      )
    })

    it('throws ValidationError when cart has no equipment items', async () => {
      mockCartFindFirst.mockResolvedValue({
        id: 'cart1',
        userId: 'c1',
        items: [],
      })
      await expect(QuoteService.createQuoteFromCart('cart1', 'user_1')).rejects.toThrow(
        ValidationError
      )
    })

    it('throws ValidationError when cart has invalid date range', async () => {
      mockCartFindFirst.mockResolvedValue({
        id: 'cart1',
        userId: 'c1',
        items: [
          {
            itemType: 'EQUIPMENT',
            equipmentId: 'e1',
            quantity: 1,
            startDate: new Date('2026-06-10'),
            endDate: new Date('2026-06-05'),
          },
        ],
      })
      await expect(QuoteService.createQuoteFromCart('cart1', 'user_1')).rejects.toThrow(
        ValidationError
      )
    })

    it('creates quote from cart with duplicate equipment items', async () => {
      mockCartFindFirst.mockResolvedValue({
        id: 'cart1',
        userId: 'c1',
        items: [
          { itemType: 'EQUIPMENT', equipmentId: 'e1', quantity: 1, startDate: new Date('2026-06-01'), endDate: new Date('2026-06-05') },
          { itemType: 'EQUIPMENT', equipmentId: 'e1', quantity: 2, startDate: new Date('2026-06-01'), endDate: new Date('2026-06-05') },
        ],
      })
      mockEquipmentFindMany.mockResolvedValue([{ id: 'e1', dailyPrice: 100 }])
      mockQuoteFindFirst.mockResolvedValue(null)
      mockQuoteCreate.mockResolvedValue({
        ...baseQuote,
        id: 'q2',
        equipmentItems: [],
        equipment: baseQuote.equipment,
      })
      mockQuoteEquipmentCreateMany.mockResolvedValue({ count: 1 })
      mockQuoteUpdate.mockResolvedValue({})
      const result = await QuoteService.createQuoteFromCart('cart1', 'user_1')
      expect(result).toBeDefined()
      const createData = mockQuoteCreate.mock.calls[0][0]?.data
      expect(createData?.equipment).toHaveLength(1)
      expect(createData?.equipment?.[0]?.quantity).toBe(3)
    })

    it('creates quote from cart with equipment items', async () => {
      mockCartFindFirst.mockResolvedValue({
        id: 'cart1',
        userId: 'c1',
        items: [
          {
            itemType: 'EQUIPMENT',
            equipmentId: 'e1',
            quantity: 1,
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-05'),
          },
        ],
      })
      mockEquipmentFindMany.mockResolvedValue([{ id: 'e1', dailyPrice: 100 }])
      mockQuoteFindFirst.mockResolvedValue(null)
      mockQuoteCreate.mockResolvedValue({
        ...baseQuote,
        id: 'q2',
        equipmentItems: [],
        equipment: baseQuote.equipment,
      })
      mockQuoteEquipmentCreateMany.mockResolvedValue({ count: 1 })
      mockQuoteUpdate.mockResolvedValue({})
      const result = await QuoteService.createQuoteFromCart('cart1', 'user_1')
      expect(result).toBeDefined()
      expect(mockQuoteCreate).toHaveBeenCalled()
      expect(mockQuoteUpdate).toHaveBeenCalledWith({
        where: { id: 'q2' },
        data: { cartId: 'cart1' },
      })
    })

    it('creates quote from cart with kit items', async () => {
      mockCartFindFirst.mockResolvedValue({
        id: 'cart1',
        userId: 'c1',
        items: [
          {
            itemType: 'KIT',
            kitId: 'kit1',
            quantity: 1,
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-05'),
          },
        ],
      })
      mockKitEquipmentFindMany.mockResolvedValue([
        { equipmentId: 'e1', quantity: 2 },
        { equipmentId: 'e1', quantity: 1 },
        { equipmentId: 'e2', quantity: 1 },
      ])
      mockEquipmentFindMany.mockResolvedValue([{ id: 'e1', dailyPrice: 50 }, { id: 'e2', dailyPrice: 30 }])
      mockQuoteFindFirst.mockResolvedValue(null)
      mockQuoteCreate.mockResolvedValue({
        ...baseQuote,
        id: 'q3',
        equipmentItems: [],
        equipment: baseQuote.equipment,
      })
      mockQuoteEquipmentCreateMany.mockResolvedValue({ count: 3 })
      mockQuoteUpdate.mockResolvedValue({})
      const result = await QuoteService.createQuoteFromCart('cart1', 'user_1')
      expect(result).toBeDefined()
      expect(mockKitEquipmentFindMany).toHaveBeenCalled()
      expect(mockQuoteCreate).toHaveBeenCalled()
      const createData = mockQuoteCreate.mock.calls[0][0]?.data
      expect(createData?.equipment).toHaveLength(2)
    })

    it('creates quote from cart with package items', async () => {
      mockCartFindFirst.mockResolvedValue({
        id: 'cart1',
        userId: 'c1',
        items: [
          {
            itemType: 'PACKAGE',
            kitId: 'pkg1',
            quantity: 1,
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-05'),
          },
        ],
      })
      mockKitEquipmentFindMany.mockResolvedValue([
        { equipmentId: 'e1', quantity: 1 },
        { equipmentId: 'e2', quantity: 1 },
      ])
      mockEquipmentFindMany.mockResolvedValue([{ id: 'e1', dailyPrice: 50 }, { id: 'e2', dailyPrice: 30 }])
      mockQuoteFindFirst.mockResolvedValue(null)
      mockQuoteCreate.mockResolvedValue({
        ...baseQuote,
        id: 'q4',
        equipmentItems: [],
        equipment: baseQuote.equipment,
      })
      mockQuoteEquipmentCreateMany.mockResolvedValue({ count: 2 })
      mockQuoteUpdate.mockResolvedValue({})
      const result = await QuoteService.createQuoteFromCart('cart1', 'user_1')
      expect(result).toBeDefined()
      expect(mockKitEquipmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { kitId: 'pkg1' } })
      )
      expect(mockQuoteCreate).toHaveBeenCalled()
    })

    it('creates quote from cart with items lacking dates (uses defaults)', async () => {
      mockCartFindFirst.mockResolvedValue({
        id: 'cart1',
        userId: 'c1',
        items: [
          {
            itemType: 'EQUIPMENT',
            equipmentId: 'e1',
            quantity: 1,
            startDate: null,
            endDate: null,
          },
        ],
      })
      mockEquipmentFindMany.mockResolvedValue([{ id: 'e1', dailyPrice: 100 }])
      mockQuoteFindFirst.mockResolvedValue(null)
      mockQuoteCreate.mockResolvedValue({
        ...baseQuote,
        id: 'q5',
        equipmentItems: [],
        equipment: baseQuote.equipment,
      })
      mockQuoteEquipmentCreateMany.mockResolvedValue({ count: 1 })
      mockQuoteUpdate.mockResolvedValue({})
      const result = await QuoteService.createQuoteFromCart('cart1', 'user_1')
      expect(result).toBeDefined()
      expect(mockQuoteCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date),
          }),
        })
      )
    })
  })

  describe('transformToQuote (via getById)', () => {
    it('handles quote with null equipmentItems', async () => {
      const quoteWithNullItems = {
        ...baseQuote,
        equipmentItems: null,
        discount: null,
        depositAmount: null,
      }
      mockQuoteFindFirst.mockResolvedValue(quoteWithNullItems)
      const result = await QuoteService.getById('q1', 'user_1')
      expect(result).toMatchObject({
        id: 'q1',
        equipment: [],
        discount: undefined,
        depositAmount: undefined,
      })
    })

    it('handles quote with undefined discount and depositAmount', async () => {
      const quoteMinimal = {
        ...baseQuote,
        equipmentItems: [],
        discount: null,
        depositAmount: null,
      }
      mockQuoteFindFirst.mockResolvedValue(quoteMinimal)
      const result = await QuoteService.getById('q1', 'user_1')
      expect(result.discount).toBeUndefined()
      expect(result.depositAmount).toBeUndefined()
    })

    it('handles quote with defined discount and depositAmount', async () => {
      const quoteWithDiscount = {
        ...baseQuote,
        equipmentItems: [],
        discount: 10,
        depositAmount: 50,
      }
      mockQuoteFindFirst.mockResolvedValue(quoteWithDiscount)
      const result = await QuoteService.getById('q1', 'user_1')
      expect(result.discount).toBe(10)
      expect(result.depositAmount).toBe(50)
    })
  })
})
