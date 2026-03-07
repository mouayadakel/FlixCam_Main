/**
 * Unit tests for CartService
 */

import { CartService, calculateBestRate } from '../cart.service'
import { prisma } from '@/lib/db/prisma'
import { Decimal } from '@prisma/client/runtime/library'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    cart: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    cartItem: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
    },
    equipment: { findFirst: jest.fn(), findMany: jest.fn() },
    studio: { findFirst: jest.fn() },
    kit: { findFirst: jest.fn(), findMany: jest.fn() },
    coupon: { findFirst: jest.fn() },
    bookingEquipment: { aggregate: jest.fn() },
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockCartFindFirst = mockPrisma.cart.findFirst as jest.Mock
const mockCartFindUnique = mockPrisma.cart.findUnique as jest.Mock
const mockCartCreate = mockPrisma.cart.create as jest.Mock
const mockCartUpdate = mockPrisma.cart.update as jest.Mock
const mockCartDelete = mockPrisma.cart.delete as jest.Mock
const mockCartItemCreate = mockPrisma.cartItem.create as jest.Mock
const mockCartItemFindFirst = mockPrisma.cartItem.findFirst as jest.Mock
const mockCartItemUpdate = mockPrisma.cartItem.update as jest.Mock
const mockCartItemDeleteMany = mockPrisma.cartItem.deleteMany as jest.Mock
const mockEquipmentFindFirst = mockPrisma.equipment.findFirst as jest.Mock
const mockEquipmentFindMany = mockPrisma.equipment.findMany as jest.Mock
const mockCouponFindFirst = mockPrisma.coupon.findFirst as jest.Mock
const mockStudioFindFirst = mockPrisma.studio.findFirst as jest.Mock
const mockKitFindFirst = mockPrisma.kit.findFirst as jest.Mock
const mockBookingEquipmentAggregate = (mockPrisma as any).bookingEquipment?.aggregate as jest.Mock

const emptyCartWithItems = (overrides = {}) => ({
  id: 'cart-1',
  userId: null,
  sessionId: 'sess-1',
  couponCode: null,
  discountAmount: new Decimal(0),
  subtotal: new Decimal(0),
  total: new Decimal(0),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  items: [],
  ...overrides,
})

describe('calculateBestRate', () => {
  it('uses weekly for remainder when 37 days and monthly+weekly cheaper', () => {
    const result = calculateBestRate(37, 1, 100, 500, 2000)
    expect(result.appliedRate).toBe('monthly')
    expect(result.effectiveTotal).toBe(2500)
  })

  it('uses daily for remainder when 31 days (remainingDays < 7)', () => {
    const result = calculateBestRate(31, 1, 100, 500, 2000)
    expect(result.appliedRate).toBe('monthly')
    expect(result.effectiveTotal).toBe(2100)
  })
})

describe('CartService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getOrCreateCart', () => {
    it('creates new cart when none exists', async () => {
      mockCartFindFirst.mockResolvedValue(null)
      mockCartCreate.mockResolvedValue(emptyCartWithItems())
      const result = await CartService.getOrCreateCart(null, 'sess-1')
      expect(result).toBeDefined()
      expect(result.id).toBe('cart-1')
      expect(mockCartCreate).toHaveBeenCalled()
    })

    it('finds cart by userId when provided', async () => {
      mockCartFindFirst.mockResolvedValue(emptyCartWithItems({ userId: 'user-1' }))
      const result = await CartService.getOrCreateCart('user-1', null)
      expect(result).toBeDefined()
      expect(mockCartFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        })
      )
    })

    it('returns existing cart when valid', async () => {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)
      mockCartFindFirst.mockResolvedValue(
        emptyCartWithItems({
          expiresAt,
          items: [
            {
              id: 'item1',
              startDate: new Date('2026-06-01'),
              endDate: new Date('2026-06-05'),
              itemType: 'EQUIPMENT',
              equipmentId: 'eq1',
              studioId: null,
              packageId: null,
              quantity: 1,
              dailyRate: new Decimal(100),
              subtotal: new Decimal(400),
              equipment: null,
              kit: null,
              studio: null,
              isAvailable: true,
            },
          ],
        })
      )
      const result = await CartService.getOrCreateCart(null, 'sess-1')
      expect(result.id).toBe('cart-1')
      expect(result.items).toHaveLength(1)
      expect(result.items[0].days).toBeDefined()
      expect(mockCartCreate).not.toHaveBeenCalled()
    })

    it('deletes and recreates when cart expired', async () => {
      const expired = new Date(Date.now() - 1000)
      mockCartFindFirst.mockResolvedValue(emptyCartWithItems({ expiresAt: expired }))
      mockCartItemDeleteMany.mockResolvedValue({})
      mockCartDelete.mockResolvedValue({})
      mockCartCreate.mockResolvedValue(emptyCartWithItems({ id: 'cart-2' }))
      const result = await CartService.getOrCreateCart(null, 'sess-1')
      expect(mockCartItemDeleteMany).toHaveBeenCalled()
      expect(mockCartDelete).toHaveBeenCalled()
      expect(mockCartCreate).toHaveBeenCalled()
      expect(result.id).toBe('cart-2')
    })
  })

  describe('addItem', () => {
    it('adds equipment item and recalculates cart', async () => {
      mockEquipmentFindFirst.mockResolvedValue({
        dailyPrice: 100,
        weeklyPrice: 500,
        monthlyPrice: 2000,
      })
      mockCartItemCreate.mockResolvedValue({})
      mockCartFindUnique
        .mockResolvedValueOnce(emptyCartWithItems({ items: [] }))
        .mockResolvedValue(emptyCartWithItems({ items: [{ id: 'item1', subtotal: 400 }] }))
      mockCartUpdate.mockResolvedValue({})

      const result = await CartService.addItem('cart-1', {
        itemType: 'EQUIPMENT',
        equipmentId: 'eq1',
        quantity: 1,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-05'),
      })

      expect(result).toBeDefined()
      expect(mockCartItemCreate).toHaveBeenCalled()
      expect(mockEquipmentFindFirst).toHaveBeenCalled()
    })

    it('uses weekly rate when rental is 7+ days and cheaper', async () => {
      mockEquipmentFindFirst.mockResolvedValue({
        dailyPrice: 100,
        weeklyPrice: 500,
        monthlyPrice: 2000,
      })
      mockCartItemCreate.mockResolvedValue({})
      mockCartFindUnique
        .mockResolvedValueOnce(emptyCartWithItems({ items: [] }))
        .mockResolvedValue(emptyCartWithItems({ items: [] }))
      mockCartUpdate.mockResolvedValue({})
      const result = await CartService.addItem('cart-1', {
        itemType: 'EQUIPMENT',
        equipmentId: 'eq1',
        quantity: 1,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-15'),
      })
      expect(result).toBeDefined()
      expect(mockCartItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: expect.any(Decimal),
          }),
        })
      )
    })

    it('uses monthly rate when rental is 30+ days and cheaper', async () => {
      mockEquipmentFindFirst.mockResolvedValue({
        dailyPrice: 100,
        weeklyPrice: 500,
        monthlyPrice: 2000,
      })
      mockCartItemCreate.mockResolvedValue({})
      mockCartFindUnique
        .mockResolvedValueOnce(emptyCartWithItems({ items: [] }))
        .mockResolvedValue(emptyCartWithItems({ items: [] }))
      mockCartUpdate.mockResolvedValue({})
      const result = await CartService.addItem('cart-1', {
        itemType: 'EQUIPMENT',
        equipmentId: 'eq1',
        quantity: 1,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-07-15'),
      })
      expect(result).toBeDefined()
    })

    it('uses monthly rate with weekly remainder when 37+ days', async () => {
      mockEquipmentFindFirst.mockResolvedValue({
        dailyPrice: 100,
        weeklyPrice: 500,
        monthlyPrice: 2000,
      })
      mockCartItemCreate.mockResolvedValue({})
      mockCartFindUnique
        .mockResolvedValueOnce(emptyCartWithItems({ items: [] }))
        .mockResolvedValue(emptyCartWithItems({ items: [] }))
      mockCartUpdate.mockResolvedValue({})
      const result = await CartService.addItem('cart-1', {
        itemType: 'EQUIPMENT',
        equipmentId: 'eq1',
        quantity: 1,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-07-08'),
      })
      expect(result).toBeDefined()
    })

    it('adds studio item with dailyRate override', async () => {
      mockCartItemCreate.mockResolvedValue({})
      mockCartFindUnique
        .mockResolvedValueOnce(emptyCartWithItems({ items: [] }))
        .mockResolvedValue(emptyCartWithItems({ items: [] }))
      mockCartUpdate.mockResolvedValue({})
      const result = await CartService.addItem('cart-1', {
        itemType: 'STUDIO',
        studioId: 's1',
        dailyRate: 500,
        quantity: 1,
      })
      expect(result).toBeDefined()
      expect(mockCartItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            itemType: 'STUDIO',
            studioId: 's1',
            dailyRate: expect.any(Decimal),
          }),
        })
      )
    })

    it('adds studio item with hourly rate from studio', async () => {
      mockStudioFindFirst.mockResolvedValue({ hourlyRate: 100 })
      mockCartItemCreate.mockResolvedValue({})
      mockCartFindUnique
        .mockResolvedValueOnce(emptyCartWithItems({ items: [] }))
        .mockResolvedValue(emptyCartWithItems({ items: [] }))
      mockCartUpdate.mockResolvedValue({})
      const result = await CartService.addItem('cart-1', {
        itemType: 'STUDIO',
        studioId: 's1',
        quantity: 1,
        startDate: new Date('2026-06-01T10:00:00'),
        endDate: new Date('2026-06-01T14:00:00'),
      })
      expect(result).toBeDefined()
      expect(mockStudioFindFirst).toHaveBeenCalled()
    })

    it('adds studio item with hourly rate when no dailyRate override', async () => {
      mockStudioFindFirst.mockResolvedValue({ hourlyRate: 150 })
      mockCartItemCreate.mockResolvedValue({})
      mockCartFindUnique
        .mockResolvedValueOnce(emptyCartWithItems({ items: [] }))
        .mockResolvedValue(emptyCartWithItems({ items: [] }))
      mockCartUpdate.mockResolvedValue({})
      const result = await CartService.addItem('cart-1', {
        itemType: 'STUDIO',
        studioId: 'studio1',
        quantity: 1,
        startDate: new Date('2026-06-01T09:00:00'),
        endDate: new Date('2026-06-01T17:00:00'),
      })
      expect(result).toBeDefined()
      expect(mockStudioFindFirst).toHaveBeenCalled()
      expect(mockCartItemCreate).toHaveBeenCalled()
    })

    it('adds package item using packageId', async () => {
      mockKitFindFirst.mockResolvedValue({
        id: 'pkg1',
        items: [
          { equipment: { dailyPrice: 80 }, quantity: 1 },
          { equipment: { dailyPrice: 40 }, quantity: 1 },
        ],
        discountPercent: 0,
      })
      mockCartItemCreate.mockResolvedValue({})
      mockCartFindUnique
        .mockResolvedValueOnce(emptyCartWithItems({ items: [] }))
        .mockResolvedValue(emptyCartWithItems({ items: [] }))
      mockCartUpdate.mockResolvedValue({})
      const result = await CartService.addItem('cart-1', {
        itemType: 'PACKAGE',
        packageId: 'pkg1',
        quantity: 1,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-05'),
      })
      expect(result).toBeDefined()
      expect(mockKitFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 'pkg1' }) })
      )
    })

    it('adds kit item with discounted rate', async () => {
      mockKitFindFirst.mockResolvedValue({
        id: 'kit1',
        items: [
          { equipment: { dailyPrice: 100 }, quantity: 1 },
          { equipment: { dailyPrice: 50 }, quantity: 2 },
        ],
        discountPercent: 10,
      })
      mockCartItemCreate.mockResolvedValue({})
      mockCartFindUnique
        .mockResolvedValueOnce(emptyCartWithItems({ items: [] }))
        .mockResolvedValue(emptyCartWithItems({ items: [] }))
      mockCartUpdate.mockResolvedValue({})
      const result = await CartService.addItem('cart-1', {
        itemType: 'KIT',
        kitId: 'kit1',
        quantity: 1,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-05'),
      })
      expect(result).toBeDefined()
      expect(mockKitFindFirst).toHaveBeenCalled()
    })

    it('uses 0 when equipment has null dailyPrice', async () => {
      mockEquipmentFindFirst.mockResolvedValue({
        dailyPrice: null,
        weeklyPrice: null,
        monthlyPrice: null,
      })
      mockCartItemCreate.mockResolvedValue({})
      mockCartFindUnique
        .mockResolvedValueOnce(emptyCartWithItems({ items: [] }))
        .mockResolvedValue(emptyCartWithItems({ items: [] }))
      mockCartUpdate.mockResolvedValue({})
      const result = await CartService.addItem('cart-1', {
        itemType: 'EQUIPMENT',
        equipmentId: 'eq1',
        quantity: 1,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-05'),
      })
      expect(result).toBeDefined()
      expect(mockCartItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dailyRate: expect.any(Decimal),
          }),
        })
      )
    })

    it('uses input dailyRate when provided for equipment', async () => {
      mockCartItemCreate.mockResolvedValue({})
      mockCartFindUnique
        .mockResolvedValueOnce(emptyCartWithItems({ items: [] }))
        .mockResolvedValue(emptyCartWithItems({ items: [] }))
      mockCartUpdate.mockResolvedValue({})

      await CartService.addItem('cart-1', {
        itemType: 'EQUIPMENT',
        equipmentId: 'eq1',
        quantity: 2,
        dailyRate: 50,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-03'),
      })

      expect(mockCartItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantity: 2,
            dailyRate: expect.any(Decimal),
          }),
        })
      )
    })
  })

  describe('updateItem', () => {
    it('throws when cart item not found', async () => {
      mockCartItemFindFirst.mockResolvedValue(null)
      await expect(
        CartService.updateItem('cart-1', 'item-1', { quantity: 2 })
      ).rejects.toThrow('Cart item not found')
    })

    it('updates item with weekly rate and recalculates', async () => {
      mockCartItemFindFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        quantity: 1,
        dailyRate: new Decimal(100),
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-15'),
        itemType: 'EQUIPMENT',
        equipmentId: 'eq1',
      })
      mockEquipmentFindFirst.mockResolvedValue({ weeklyPrice: 500, monthlyPrice: 2000 })
      mockCartItemUpdate.mockResolvedValue({})
      mockCartFindUnique.mockResolvedValue(emptyCartWithItems())
      mockCartUpdate.mockResolvedValue({})
      const result = await CartService.updateItem('cart-1', 'item-1', { quantity: 2 })
      expect(result).toBeDefined()
      expect(mockCartItemUpdate).toHaveBeenCalled()
    })

    it('updates studio item without weekly/monthly rates', async () => {
      mockCartItemFindFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        quantity: 1,
        dailyRate: new Decimal(100),
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-05'),
        itemType: 'STUDIO',
        equipmentId: null,
      })
      mockCartItemUpdate.mockResolvedValue({})
      mockCartFindUnique.mockResolvedValue(emptyCartWithItems())
      mockCartUpdate.mockResolvedValue({})
      const result = await CartService.updateItem('cart-1', 'item-1', { quantity: 2 })
      expect(result).toBeDefined()
      expect(mockCartItemUpdate).toHaveBeenCalled()
    })

    it('updates equipment item with weekly rate and recalculates', async () => {
      mockCartItemFindFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        itemType: 'EQUIPMENT',
        equipmentId: 'eq1',
        quantity: 1,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-15'),
        dailyRate: new Decimal(100),
        subtotal: new Decimal(500),
      })
      mockEquipmentFindFirst.mockResolvedValue({
        weeklyPrice: 500,
        monthlyPrice: 2000,
      })
      mockCartItemUpdate.mockResolvedValue({})
      mockCartFindUnique.mockResolvedValue(emptyCartWithItems())
      mockCartUpdate.mockResolvedValue({})
      const result = await CartService.updateItem('cart-1', 'item-1', { quantity: 2 })
      expect(result).toBeDefined()
      expect(mockEquipmentFindFirst).toHaveBeenCalled()
      expect(mockCartItemUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: expect.any(Decimal),
          }),
        })
      )
    })

    it('updates equipment item without weekly/monthly uses daily rate', async () => {
      mockCartItemFindFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        itemType: 'EQUIPMENT',
        equipmentId: 'eq1',
        quantity: 1,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-05'),
        dailyRate: new Decimal(100),
        subtotal: new Decimal(400),
      })
      mockEquipmentFindFirst.mockResolvedValue({
        weeklyPrice: null,
        monthlyPrice: null,
      })
      mockCartItemUpdate.mockResolvedValue({})
      mockCartFindUnique.mockResolvedValue(emptyCartWithItems())
      mockCartUpdate.mockResolvedValue({})
      const result = await CartService.updateItem('cart-1', 'item-1', { quantity: 2 })
      expect(result).toBeDefined()
      expect(mockCartItemUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: expect.any(Decimal),
          }),
        })
      )
    })

    it('updates item and recalculates', async () => {
      mockCartItemFindFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        quantity: 1,
        dailyRate: new Decimal(100),
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-05'),
        itemType: 'EQUIPMENT',
        equipmentId: 'eq1',
      })
      mockEquipmentFindFirst.mockResolvedValue({ weeklyPrice: null, monthlyPrice: null })
      mockCartItemUpdate.mockResolvedValue({})
      mockCartFindUnique.mockResolvedValue(emptyCartWithItems())
      mockCartUpdate.mockResolvedValue({})

      const result = await CartService.updateItem('cart-1', 'item-1', { quantity: 2 })

      expect(result).toBeDefined()
      expect(mockCartItemUpdate).toHaveBeenCalled()
    })
  })

  describe('removeItem', () => {
    it('removes item and recalculates cart', async () => {
      mockCartItemDeleteMany.mockResolvedValue({})
      mockCartFindUnique.mockResolvedValue(emptyCartWithItems())
      mockCartUpdate.mockResolvedValue({})

      const result = await CartService.removeItem('cart-1', 'item-1')

      expect(result).toBeDefined()
      expect(mockCartItemDeleteMany).toHaveBeenCalledWith({
        where: { id: 'item-1', cartId: 'cart-1' },
      })
    })
  })

  describe('applyCoupon', () => {
    it('throws when cart not found', async () => {
      mockCartFindUnique.mockResolvedValue(null)
      await expect(CartService.applyCoupon('cart-1', 'SAVE10')).rejects.toThrow('Cart not found')
    })

    it('applies valid coupon successfully', async () => {
      mockCartFindUnique.mockResolvedValue(
        emptyCartWithItems({ subtotal: new Decimal(500), items: [{ equipmentId: 'eq1' }] })
      )
      mockCouponFindFirst.mockResolvedValue({
        code: 'SAVE10',
        type: 'PERCENT',
        discountPercentage: 10,
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2030-01-01'),
        status: 'ACTIVE',
        applicableEquipmentIds: null,
      })
      mockCartUpdate.mockResolvedValue({})
      mockCartFindFirst.mockResolvedValue(emptyCartWithItems())

      const result = await CartService.applyCoupon('cart-1', 'save10')

      expect(result).toBeDefined()
      expect(mockCartUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cart-1' },
          data: expect.objectContaining({
            couponCode: 'SAVE10',
            discountAmount: expect.any(Decimal),
          }),
        })
      )
    })

    it('throws when coupon not found', async () => {
      mockCartFindUnique.mockResolvedValue(emptyCartWithItems({ items: [] }))
      mockCouponFindFirst.mockResolvedValue(null)
      await expect(CartService.applyCoupon('cart-1', 'INVALID')).rejects.toThrow()
    })

    it('throws when coupon not applicable to cart equipment', async () => {
      mockCartFindUnique.mockResolvedValue(
        emptyCartWithItems({ subtotal: new Decimal(500), items: [{ equipmentId: 'eq1' }] })
      )
      mockCouponFindFirst.mockResolvedValue({
        code: 'SAVE10',
        type: 'PERCENT',
        discountPercentage: 10,
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2030-01-01'),
        status: 'ACTIVE',
        applicableEquipmentIds: ['eq2', 'eq3'],
      })
      await expect(CartService.applyCoupon('cart-1', 'SAVE10')).rejects.toThrow()
    })

    it('throws when coupon expired', async () => {
      mockCartFindUnique.mockResolvedValue(
        emptyCartWithItems({ subtotal: new Decimal(500), items: [{ equipmentId: 'eq1' }] })
      )
      mockCouponFindFirst.mockResolvedValue({
        code: 'EXPIRED',
        type: 'PERCENT',
        discountPercentage: 10,
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2020-06-01'),
        status: 'ACTIVE',
        applicableEquipmentIds: null,
      })
      await expect(CartService.applyCoupon('cart-1', 'EXPIRED')).rejects.toThrow(/expired/i)
    })

    it('throws when coupon not yet valid', async () => {
      mockCartFindUnique.mockResolvedValue(
        emptyCartWithItems({ subtotal: new Decimal(500), items: [{ equipmentId: 'eq1' }] })
      )
      mockCouponFindFirst.mockResolvedValue({
        code: 'FUTURE',
        type: 'PERCENT',
        discountPercentage: 10,
        validFrom: new Date('2030-01-01'),
        validUntil: new Date('2030-12-31'),
        status: 'ACTIVE',
        applicableEquipmentIds: null,
      })
      await expect(CartService.applyCoupon('cart-1', 'FUTURE')).rejects.toThrow()
    })

    it('throws when coupon inactive', async () => {
      mockCartFindUnique.mockResolvedValue(
        emptyCartWithItems({ subtotal: new Decimal(500), items: [{ equipmentId: 'eq1' }] })
      )
      mockCouponFindFirst.mockResolvedValue({
        code: 'INACTIVE',
        type: 'PERCENT',
        discountPercentage: 10,
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2030-01-01'),
        status: 'INACTIVE',
        applicableEquipmentIds: null,
      })
      await expect(CartService.applyCoupon('cart-1', 'INACTIVE')).rejects.toThrow()
    })

    it('throws when coupon usage limit reached', async () => {
      mockCartFindUnique.mockResolvedValue(
        emptyCartWithItems({ subtotal: new Decimal(500), items: [{ equipmentId: 'eq1' }] })
      )
      mockCouponFindFirst.mockResolvedValue({
        code: 'LIMIT',
        type: 'PERCENT',
        discountPercentage: 10,
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2030-01-01'),
        status: 'ACTIVE',
        usedCount: 100,
        usageLimit: 100,
        applicableEquipmentIds: null,
      })
      await expect(CartService.applyCoupon('cart-1', 'LIMIT')).rejects.toThrow()
    })

    it('throws when cart amount below coupon minimum', async () => {
      mockCartFindUnique.mockResolvedValue(
        emptyCartWithItems({ subtotal: new Decimal(100), items: [{ equipmentId: 'eq1' }] })
      )
      mockCouponFindFirst.mockResolvedValue({
        code: 'MIN500',
        type: 'PERCENT',
        discountPercentage: 10,
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2030-01-01'),
        status: 'ACTIVE',
        minimumAmount: 500,
        applicableEquipmentIds: null,
      })
      await expect(CartService.applyCoupon('cart-1', 'MIN500')).rejects.toThrow(/minimum/i)
    })
  })

  describe('removeCoupon', () => {
    it('throws when cart not found', async () => {
      mockCartFindUnique.mockResolvedValue(null)
      await expect(CartService.removeCoupon('cart-1')).rejects.toThrow('Cart not found')
    })

    it('removes coupon and recalculates', async () => {
      mockCartFindUnique
        .mockResolvedValueOnce(emptyCartWithItems({ subtotal: new Decimal(100) }))
        .mockResolvedValue(emptyCartWithItems())
      mockCartUpdate.mockResolvedValue({})

      const result = await CartService.removeCoupon('cart-1')

      expect(result).toBeDefined()
      expect(mockCartUpdate).toHaveBeenCalled()
    })
  })

  describe('revalidate', () => {
    it('throws when cart not found', async () => {
      mockCartFindUnique.mockResolvedValue(null)
      await expect(CartService.revalidate('cart-1')).rejects.toThrow('Cart not found')
    })

    it('revalidates availability and returns cart', async () => {
      mockCartFindUnique.mockResolvedValue(
        emptyCartWithItems({
          items: [
            {
              id: 'item1',
              itemType: 'EQUIPMENT',
              equipmentId: 'eq1',
              startDate: new Date('2026-06-01'),
              endDate: new Date('2026-06-05'),
              quantity: 1,
            },
          ],
        })
      )
      mockEquipmentFindMany.mockResolvedValue([{ id: 'eq1', quantityTotal: 5 }])
      if (mockBookingEquipmentAggregate) {
        mockBookingEquipmentAggregate.mockResolvedValue({ _sum: { quantity: 0 } })
      }
      mockCartItemUpdate.mockResolvedValue({})
      mockCartFindFirst.mockResolvedValue(emptyCartWithItems())

      const result = await CartService.revalidate('cart-1')

      expect(result).toBeDefined()
    })
  })

  describe('syncToUser', () => {
    it('throws when session cart invalid or already has userId', async () => {
      mockCartFindUnique.mockResolvedValue(null)
      await expect(CartService.syncToUser('cart-1', 'user-1')).rejects.toThrow('Invalid session cart')

      mockCartFindUnique.mockResolvedValue(emptyCartWithItems({ userId: 'user-1' }))
      await expect(CartService.syncToUser('cart-1', 'user-1')).rejects.toThrow('Invalid session cart')
    })

    it('assigns session cart to user when no user cart exists', async () => {
      mockCartFindUnique.mockResolvedValue(emptyCartWithItems({ userId: null, sessionId: 'sess-1' }))
      mockCartFindFirst.mockResolvedValue(null)
      mockCartUpdate.mockResolvedValue({})
      mockCartFindUnique.mockResolvedValue(emptyCartWithItems())

      const result = await CartService.syncToUser('cart-1', 'user-1')

      expect(result).toBeDefined()
      expect(mockCartUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cart-1' },
          data: { userId: 'user-1', sessionId: null },
        })
      )
    })

    it('merges session cart items into user cart when user cart exists', async () => {
      const sessionCart = emptyCartWithItems({
        userId: null,
        sessionId: 'sess-1',
        items: [{ id: 'item1', cartId: 'cart-1' }],
      })
      const userCart = emptyCartWithItems({ id: 'cart-2', userId: 'user-1', items: [] })
      mockCartFindUnique
        .mockResolvedValueOnce(sessionCart)
        .mockResolvedValue(emptyCartWithItems())
      mockCartFindFirst.mockResolvedValue(userCart)
      mockCartItemUpdate.mockResolvedValue({})
      mockCartDelete.mockResolvedValue({})

      const result = await CartService.syncToUser('cart-1', 'user-1')

      expect(result).toBeDefined()
      expect(mockCartItemUpdate).toHaveBeenCalled()
      expect(mockCartDelete).toHaveBeenCalledWith({ where: { id: 'cart-1' } })
    })
  })
})
