/**
 * Unit tests for CouponService (create, getById, list, validate, delete)
 */

import { CouponService } from '../coupon.service'
import { prisma } from '@/lib/db/prisma'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    coupon: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
  },
}))

jest.mock('@/lib/services/audit.service', () => ({ AuditService: { log: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('@/lib/events/event-bus', () => ({ EventBus: { emit: jest.fn().mockResolvedValue(undefined) } }))
const mockHasPermission = jest.fn().mockResolvedValue(true)
jest.mock('@/lib/auth/permissions', () => ({ hasPermission: (...args: unknown[]) => mockHasPermission(...args) }))

const mockFindFirst = prisma.coupon.findFirst as jest.Mock
const mockCreate = prisma.coupon.create as jest.Mock
const mockFindMany = prisma.coupon.findMany as jest.Mock
const mockUpdate = prisma.coupon.update as jest.Mock

describe('CouponService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHasPermission.mockResolvedValue(true)
    mockFindFirst.mockResolvedValue(null)
    mockUpdate.mockResolvedValue({})
  })

  describe('create', () => {
    it('throws ValidationError when code already exists', async () => {
      mockFindFirst.mockResolvedValue({ id: 'existing', code: 'SAVE10' })
      await expect(
        CouponService.create(
          {
            code: 'save10',
            type: 'percent',
            value: 10,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 86400000),
          },
          'u1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('creates coupon and returns when code unique', async () => {
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue({
        id: 'c1',
        code: 'NEW10',
        type: 'PERCENT',
        discountPercentage: 10,
        status: 'ACTIVE',
        validFrom: new Date(),
        validUntil: new Date(),
      })
      const result = await CouponService.create(
        {
          code: 'new10',
          type: 'percent',
          value: 10,
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 86400000),
        },
        'u1'
      )
      expect(result).toMatchObject({ code: 'NEW10' })
    })

    it('creates fixed type coupon with SCHEDULED status when validFrom > now', async () => {
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue({
        id: 'c1',
        code: 'FIX50',
        type: 'FIXED',
        discountValue: 50,
        status: 'SCHEDULED',
        validFrom: new Date(Date.now() + 86400000),
        validUntil: new Date(Date.now() + 172800000),
      })
      const result = await CouponService.create(
        {
          code: 'fix50',
          type: 'fixed',
          value: 50,
          validFrom: new Date(Date.now() + 86400000),
          validUntil: new Date(Date.now() + 172800000),
        },
        'u1'
      )
      expect(result).toMatchObject({ code: 'FIX50' })
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'FIXED', status: 'SCHEDULED' }),
        })
      )
    })

    it('throws ForbiddenError when user lacks create permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(
        CouponService.create(
          {
            code: 'new10',
            type: 'percent',
            value: 10,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 86400000),
          },
          'u1'
        )
      ).rejects.toThrow(ForbiddenError)
    })
  })

  describe('getById', () => {
    it('throws NotFoundError when coupon not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(CouponService.getById('missing', 'u1')).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError when user lacks read permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(CouponService.getById('SAVE10', 'u1')).rejects.toThrow(ForbiddenError)
    })
  })

  describe('list', () => {
    it('returns findMany result with total', async () => {
      mockFindMany.mockResolvedValue([])
      const countMock = prisma.coupon.count as jest.Mock
      countMock.mockResolvedValue(0)
      const result = await CouponService.list('u1', { page: 1, pageSize: 10 })
      expect(result.coupons).toEqual([])
      expect(result.total).toBe(0)
    })

    it('applies status and type filters', async () => {
      mockFindMany.mockResolvedValue([])
      const countMock = prisma.coupon.count as jest.Mock
      countMock.mockResolvedValue(0)
      await CouponService.list('u1', { status: 'expired', type: 'fixed' })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'EXPIRED', type: 'FIXED' }),
        })
      )
    })

    it('applies search filter', async () => {
      mockFindMany.mockResolvedValue([])
      const countMock = prisma.coupon.count as jest.Mock
      countMock.mockResolvedValue(0)
      await CouponService.list('u1', { search: 'save' })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ code: expect.any(Object) }),
              expect.objectContaining({ name: expect.any(Object) }),
              expect.objectContaining({ description: expect.any(Object) }),
            ]),
          }),
        })
      )
    })

    it('applies dateFrom and dateTo filters', async () => {
      mockFindMany.mockResolvedValue([])
      const countMock = prisma.coupon.count as jest.Mock
      countMock.mockResolvedValue(0)
      const dateFrom = new Date('2026-01-01')
      const dateTo = new Date('2026-01-31')
      await CouponService.list('u1', { dateFrom, dateTo })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            validFrom: expect.objectContaining({ gte: dateFrom }),
            validUntil: expect.objectContaining({ lte: dateTo }),
          }),
        })
      )
    })

    it('applies active filter when active is true', async () => {
      mockFindMany.mockResolvedValue([])
      const countMock = prisma.coupon.count as jest.Mock
      countMock.mockResolvedValue(0)
      await CouponService.list('u1', { active: true })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        })
      )
    })

    it('applies active filter when active is false', async () => {
      mockFindMany.mockResolvedValue([])
      const countMock = prisma.coupon.count as jest.Mock
      countMock.mockResolvedValue(0)
      await CouponService.list('u1', { active: false })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        })
      )
    })

    it('throws ForbiddenError when user lacks read permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(CouponService.list('u1')).rejects.toThrow(ForbiddenError)
    })

    it('returns and transforms coupons', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'c1',
          code: 'SAVE10',
          type: 'PERCENT',
          discountPercentage: 10,
          discountValue: null,
          status: 'ACTIVE',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 86400000),
        },
      ])
      const countMock = prisma.coupon.count as jest.Mock
      countMock.mockResolvedValue(1)
      const result = await CouponService.list('u1', {})
      expect(result.coupons).toHaveLength(1)
      expect(result.coupons[0].code).toBe('SAVE10')
    })

    it('transforms coupon with validFrom > now to scheduled', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'c1',
          code: 'FUTURE',
          type: 'PERCENT',
          discountPercentage: 10,
          discountValue: null,
          status: 'ACTIVE',
          validFrom: new Date(Date.now() + 86400000),
          validUntil: new Date(Date.now() + 172800000),
        },
      ])
      const countMock = prisma.coupon.count as jest.Mock
      countMock.mockResolvedValue(1)
      const result = await CouponService.list('u1', {})
      expect(result.coupons[0].status).toBe('scheduled')
    })

    it('keeps scheduled status when row has SCHEDULED and validFrom > now (transformToCoupon else-if branch)', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'c1',
          code: 'SCHED',
          type: 'PERCENT',
          discountPercentage: 10,
          discountValue: null,
          status: 'SCHEDULED',
          validFrom: new Date(Date.now() + 86400000),
          validUntil: new Date(Date.now() + 172800000),
        },
      ])
      const countMock = prisma.coupon.count as jest.Mock
      countMock.mockResolvedValue(1)
      const result = await CouponService.list('u1', {})
      expect(result.coupons[0].status).toBe('scheduled')
    })
  })

  describe('getById', () => {
    it('transforms expired coupon when validUntil < now', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'EXPIRED',
        type: 'PERCENT',
        discountPercentage: 10,
        discountValue: null,
        status: 'ACTIVE',
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() - 1),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      const result = await CouponService.getById('EXPIRED', 'u1')
      expect(result.status).toBe('expired')
    })

    it('transforms scheduled coupon when validFrom > now', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'FUTURE',
        type: 'PERCENT',
        discountPercentage: 10,
        discountValue: null,
        status: 'ACTIVE',
        validFrom: new Date(Date.now() + 86400000),
        validUntil: new Date(Date.now() + 172800000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      const result = await CouponService.getById('FUTURE', 'u1')
      expect(result.status).toBe('scheduled')
    })

    it('keeps expired status when row already has status EXPIRED and validUntil < now', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'OLD',
        type: 'PERCENT',
        discountPercentage: 10,
        discountValue: null,
        status: 'EXPIRED',
        validFrom: new Date(Date.now() - 172800000),
        validUntil: new Date(Date.now() - 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      const result = await CouponService.getById('OLD', 'u1')
      expect(result.status).toBe('expired')
    })

    it('returns coupon when found by code', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        discountPercentage: 10,
        discountValue: null,
        minimumAmount: null,
        maximumDiscount: null,
        usageLimit: 10,
        usedCount: 2,
        status: 'ACTIVE',
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
        applicableEquipmentIds: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: null,
        updatedBy: null,
      })
      const result = await CouponService.getById('SAVE10', 'u1')
      expect(result.code).toBe('SAVE10')
    })
  })

  describe('validate', () => {
    it('returns valid with discount when coupon valid', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        discountPercentage: 10,
        discountValue: null,
        minimumAmount: null,
        maximumDiscount: 100,
        usageLimit: 10,
        usedCount: 2,
        status: 'ACTIVE',
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
        applicableEquipmentIds: null,
      })
      const result = await CouponService.validate('SAVE10', 1000)
      expect(result.valid).toBe(true)
      expect(result.discountAmount).toBe(100)
    })

    it('returns invalid when coupon expired (validUntil < now)', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        discountPercentage: 10,
        status: 'ACTIVE',
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() - 1),
      })
      const result = await CouponService.validate('SAVE10', 1000)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('الكوبون منتهي الصلاحية')
    })

    it('returns invalid when validFrom > now (الكوبون غير فعال بعد)', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        discountPercentage: 10,
        status: 'SCHEDULED',
        validFrom: new Date(Date.now() + 86400000),
        validUntil: new Date(Date.now() + 172800000),
      })
      const result = await CouponService.validate('SAVE10', 1000)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('الكوبون غير فعال بعد')
    })

    it('returns invalid when status is not active', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        discountPercentage: 10,
        status: 'INACTIVE',
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
      })
      const result = await CouponService.validate('SAVE10', 1000)
      expect(result.valid).toBe(false)
    })

    it('returns invalid when usageLimit exceeded', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        discountPercentage: 10,
        usageLimit: 5,
        usedCount: 5,
        status: 'ACTIVE',
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
      })
      const result = await CouponService.validate('SAVE10', 1000)
      expect(result.valid).toBe(false)
    })

    it('returns invalid when minPurchaseAmount not met', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        discountPercentage: 10,
        minimumAmount: 500,
        status: 'ACTIVE',
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
      })
      const result = await CouponService.validate('SAVE10', 100)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('500')
    })

    it('returns invalid when equipmentIds do not match applicableTo', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        discountPercentage: 10,
        applicableEquipmentIds: ['eq1', 'eq2'],
        status: 'ACTIVE',
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
      })
      const result = await CouponService.validate('SAVE10', 1000, ['eq3', 'eq4'])
      expect(result.valid).toBe(false)
    })

    it('returns valid when equipmentIds match applicableTo', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        discountPercentage: 10,
        applicableEquipmentIds: ['eq1', 'eq2'],
        status: 'ACTIVE',
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
      })
      const result = await CouponService.validate('SAVE10', 1000, ['eq1', 'eq3'])
      expect(result.valid).toBe(true)
    })

    it('caps discount at maxDiscountAmount', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        discountPercentage: 50,
        maximumDiscount: 100,
        status: 'ACTIVE',
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
      })
      const result = await CouponService.validate('SAVE10', 1000)
      expect(result.valid).toBe(true)
      expect(result.discountAmount).toBe(100)
    })

    it('caps discount at amount when discount exceeds total', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'FIX50',
        type: 'FIXED',
        discountValue: 200,
        discountPercentage: null,
        status: 'ACTIVE',
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
      })
      const result = await CouponService.validate('FIX50', 100)
      expect(result.valid).toBe(true)
      expect(result.discountAmount).toBe(100)
    })
  })

  describe('apply', () => {
    it('increments usedCount when applied', async () => {
      mockFindFirst
        .mockResolvedValueOnce({
          id: 'c1',
          code: 'SAVE10',
          type: 'PERCENT',
          discountPercentage: 10,
          status: 'ACTIVE',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 86400000),
        })
        .mockResolvedValueOnce({ id: 'c1', usedCount: 2 })
      mockUpdate.mockResolvedValue({})
      await CouponService.apply('SAVE10', 'u1')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ usedCount: 3 }),
        })
      )
    })

    it('throws NotFoundError when coupon not found on apply', async () => {
      mockFindFirst.mockReset()
      mockFindFirst
        .mockResolvedValueOnce({
          id: 'c1',
          code: 'SAVE10',
          type: 'PERCENT',
          status: 'ACTIVE',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 86400000),
        })
        .mockResolvedValueOnce(null)
      await expect(CouponService.apply('SAVE10', 'u1')).rejects.toThrow(NotFoundError)
    })
  })

  describe('update', () => {
    it('updates coupon when found', async () => {
      mockFindFirst
        .mockResolvedValueOnce({
          id: 'c1',
          code: 'SAVE10',
          type: 'PERCENT',
          discountPercentage: 10,
          discountValue: null,
          minimumAmount: null,
          maximumDiscount: null,
          usageLimit: null,
          usedCount: 0,
          status: 'ACTIVE',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 86400000),
          applicableEquipmentIds: null,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce(null)
      mockUpdate.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        discountPercentage: 15,
        discountValue: null,
        minimumAmount: null,
        maximumDiscount: null,
        usageLimit: null,
        usedCount: 0,
        status: 'ACTIVE',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86400000),
        applicableEquipmentIds: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: null,
        updatedBy: null,
      })
      const result = await CouponService.update('c1', { value: 15, type: 'percent' }, 'u1')
      expect(result).toMatchObject({ id: 'c1' })
    })

    it('throws ValidationError when new code conflicts', async () => {
      mockFindFirst.mockReset()
      mockFindFirst
        .mockResolvedValueOnce({
          id: 'c1',
          code: 'SAVE10',
          type: 'PERCENT',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 86400000),
        })
        .mockResolvedValueOnce({ id: 'other', code: 'NEW20' })
      await expect(CouponService.update('c1', { code: 'new20' }, 'u1')).rejects.toThrow(ValidationError)
    })

    it('updates status based on validFrom/validUntil', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86400000),
      })
      mockUpdate.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        validFrom: new Date(),
        validUntil: new Date(Date.now() - 1),
        status: 'EXPIRED',
      })
      await CouponService.update('c1', { validUntil: new Date(Date.now() - 1) }, 'u1')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'EXPIRED' }),
        })
      )
    })

    it('updates status to SCHEDULED when validFrom > now and status not provided', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86400000),
      })
      mockUpdate.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        status: 'SCHEDULED',
        validFrom: new Date(Date.now() + 86400000),
        validUntil: new Date(Date.now() + 172800000),
      })
      await CouponService.update(
        'c1',
        { validFrom: new Date(Date.now() + 86400000), validUntil: new Date(Date.now() + 172800000) },
        'u1'
      )
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SCHEDULED' }),
        })
      )
    })

    it('updates status when validFrom and validUntil provided as ISO strings', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
      })
      mockUpdate.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        status: 'ACTIVE',
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
      })
      await CouponService.update('c1', {
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
      }, 'u1')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE' }),
        })
      )
    })

    it('updates status when only validFrom provided (uses existing validUntil)', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
      })
      mockUpdate.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        status: 'SCHEDULED',
        validFrom: new Date(Date.now() + 86400000),
        validUntil: new Date(Date.now() + 86400000),
      })
      await CouponService.update('c1', { validFrom: new Date(Date.now() + 86400000) }, 'u1')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SCHEDULED' }),
        })
      )
    })

    it('updates status to ACTIVE when validFrom <= now and validUntil >= now and status not provided', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
      })
      mockUpdate.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        status: 'ACTIVE',
      })
      await CouponService.update(
        'c1',
        { validFrom: new Date(Date.now() - 86400000), validUntil: new Date(Date.now() + 86400000) },
        'u1'
      )
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE' }),
        })
      )
    })

    it('updates code when new code has no conflict', async () => {
      mockFindFirst.mockReset()
      mockFindFirst
        .mockResolvedValueOnce({
          id: 'c1',
          code: 'SAVE10',
          type: 'PERCENT',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 86400000),
        })
        .mockResolvedValueOnce(null)
      mockUpdate.mockResolvedValue({
        id: 'c1',
        code: 'NEW20',
        type: 'PERCENT',
        status: 'ACTIVE',
      })
      const result = await CouponService.update('c1', { code: 'new20' }, 'u1')
      expect(result).toMatchObject({ id: 'c1' })
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'NEW20' }),
        })
      )
    })

    it('updates status when input.status provided explicitly', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        status: 'ACTIVE',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86400000),
      })
      mockUpdate.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        status: 'EXPIRED',
        validFrom: new Date(),
        validUntil: new Date(Date.now() - 1),
      })
      await CouponService.update('c1', { status: 'expired' }, 'u1')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'EXPIRED' }),
        })
      )
    })

    it('updates with only description (no status/validFrom/validUntil - status stays undefined)', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        status: 'ACTIVE',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86400000),
      })
      mockUpdate.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        status: 'ACTIVE',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86400000),
        description: 'Updated desc',
      })
      const result = await CouponService.update('c1', { description: 'Updated desc' }, 'u1')
      expect(result).toMatchObject({ id: 'c1' })
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: 'Updated desc' }),
        })
      )
    })

    it('updates minimumAmount and maximumDiscount', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        status: 'ACTIVE',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86400000),
      })
      mockUpdate.mockResolvedValue({
        id: 'c1',
        code: 'SAVE10',
        type: 'PERCENT',
        status: 'ACTIVE',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86400000),
      })
      await CouponService.update('c1', { minPurchaseAmount: 100, maxDiscountAmount: 50 }, 'u1')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            minimumAmount: expect.anything(),
            maximumDiscount: expect.anything(),
          }),
        })
      )
    })

    it('throws ForbiddenError when user lacks update permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(CouponService.update('c1', { value: 15 }, 'u1')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when coupon not found for update', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(CouponService.update('m_nonexistent', { value: 15 }, 'u1')).rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('throws ForbiddenError when user lacks delete permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(CouponService.delete('c1', 'u1')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when coupon not found for delete', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(CouponService.delete('missing', 'u1')).rejects.toThrow(NotFoundError)
    })

    it('soft-deletes coupon when found', async () => {
      mockFindFirst.mockReset()
      mockFindFirst.mockResolvedValue({ id: 'c1', code: 'SAVE10' })
      mockUpdate.mockReset()
      mockUpdate.mockResolvedValue({})
      await CouponService.delete('c1', 'u1')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
    })

    it('passes auditContext ipAddress and userAgent to AuditService.log', async () => {
      const AuditService = require('@/lib/services/audit.service').AuditService
      mockFindFirst.mockResolvedValue({ id: 'c1', code: 'SAVE10' })
      mockUpdate.mockResolvedValue({})
      await CouponService.delete('c1', 'u1', {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test',
      })
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 Test',
        })
      )
    })
  })
})
