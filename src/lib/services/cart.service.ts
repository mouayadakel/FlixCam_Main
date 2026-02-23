/**
 * Cart service (Phase 3.1). Public website cart: get/create, add, update, remove, coupon, revalidate.
 */

import { prisma } from '@/lib/db/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import type { CartItemType } from '@prisma/client'

const CART_EXPIRY_HOURS = 24

export interface AddCartItemInput {
  itemType: CartItemType
  equipmentId?: string
  studioId?: string
  packageId?: string
  kitId?: string
  startDate?: Date
  endDate?: Date
  quantity?: number
  dailyRate?: number
}

export interface CartWithItems {
  id: string
  userId: string | null
  sessionId: string | null
  couponCode: string | null
  discountAmount: number
  subtotal: number
  total: number
  expiresAt: Date
  items: {
    id: string
    itemType: CartItemType
    equipmentId: string | null
    studioId: string | null
    studioName?: string | null
    studioSlug?: string | null
    packageId: string | null
    kitId: string | null
    startDate: Date | null
    endDate: Date | null
    quantity: number
    dailyRate: number | null
    subtotal: number
    isAvailable: boolean
  }[]
}

export class CartService {
  /**
   * Get or create cart for user or session.
   */
  static async getOrCreateCart(
    userId: string | null,
    sessionId: string | null
  ): Promise<CartWithItems> {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + CART_EXPIRY_HOURS)

    const existing = await prisma.cart.findFirst({
      where: userId ? { userId } : { sessionId: sessionId ?? undefined },
      include: { items: { include: { studio: { select: { name: true, slug: true } } } } },
    })

    if (existing) {
      if (new Date(existing.expiresAt) < new Date()) {
        await prisma.cartItem.deleteMany({ where: { cartId: existing.id } })
        await prisma.cart.delete({ where: { id: existing.id } })
      } else {
        return this.toCartWithItems(existing)
      }
    }

    const cart = await prisma.cart.create({
      data: {
        userId: userId ?? undefined,
        sessionId: sessionId ?? undefined,
        subtotal: new Decimal(0),
        total: new Decimal(0),
        expiresAt,
      },
      include: { items: { include: { studio: { select: { name: true, slug: true } } } } },
    })
    return this.toCartWithItems(cart)
  }

  /**
   * Add item to cart. Resolves daily rate from equipment/studio/kit.
   */
  static async addItem(cartId: string, input: AddCartItemInput): Promise<CartWithItems> {
    const quantity = Math.max(1, input.quantity ?? 1)
    let dailyRate = input.dailyRate ?? 0
    let studioTotalOverride: number | null = null

    if (input.itemType === 'EQUIPMENT' && input.equipmentId) {
      const eq = await prisma.equipment.findFirst({
        where: { id: input.equipmentId, deletedAt: null },
      })
      dailyRate = eq?.dailyPrice ? Number(eq.dailyPrice) : 0
    } else if (input.itemType === 'STUDIO' && input.studioId) {
      if (input.dailyRate != null && input.dailyRate > 0) {
        studioTotalOverride = input.dailyRate
        dailyRate = input.dailyRate
      } else {
        const st = await prisma.studio.findFirst({
          where: { id: input.studioId, deletedAt: null },
        })
        dailyRate = st?.hourlyRate ? Number(st.hourlyRate) : 0
      }
    } else if (
      (input.itemType === 'KIT' || input.itemType === 'PACKAGE') &&
      (input.kitId || input.packageId)
    ) {
      const kitId = input.kitId ?? input.packageId
      const kit = await prisma.kit.findFirst({
        where: { id: kitId!, deletedAt: null },
        include: { items: { include: { equipment: true } } },
      })
      if (kit?.items?.length) {
        dailyRate = kit.items.reduce(
          (sum, i) => sum + Number(i.equipment.dailyPrice ?? 0) * i.quantity,
          0
        )
        const discount = kit.discountPercent ? Number(kit.discountPercent) : 0
        if (discount > 0) dailyRate = dailyRate * (1 - discount / 100)
      }
    }

    const startDate = input.startDate ?? null
    const endDate = input.endDate ?? null
    const msDiff = startDate && endDate ? endDate.getTime() - startDate.getTime() : 0
    const days = startDate && endDate ? Math.max(1, Math.ceil(msDiff / (24 * 60 * 60 * 1000))) : 1
    const hoursSameDay =
      startDate && endDate && msDiff > 0 && msDiff < 24 * 60 * 60 * 1000
        ? msDiff / (60 * 60 * 1000)
        : null
    const subtotalItem =
      studioTotalOverride != null && input.itemType === 'STUDIO'
        ? studioTotalOverride * quantity
        : hoursSameDay != null && input.itemType === 'STUDIO'
          ? dailyRate * quantity * hoursSameDay
          : dailyRate * quantity * days

    await prisma.cartItem.create({
      data: {
        cartId,
        itemType: input.itemType,
        equipmentId: input.equipmentId ?? undefined,
        studioId: input.studioId ?? undefined,
        packageId: input.packageId ?? undefined,
        kitId: input.kitId ?? undefined,
        startDate: startDate ?? undefined,
        endDate: endDate ?? undefined,
        quantity,
        dailyRate: new Decimal(dailyRate),
        subtotal: new Decimal(subtotalItem),
      },
    })

    return this.recalculateCart(cartId)
  }

  /**
   * Update item quantity or dates.
   */
  static async updateItem(
    cartId: string,
    itemId: string,
    data: { quantity?: number; startDate?: Date; endDate?: Date }
  ): Promise<CartWithItems> {
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
    })
    if (!item) throw new Error('Cart item not found')

    const quantity = data.quantity ?? item.quantity
    const startDate = data.startDate ?? item.startDate
    const endDate = data.endDate ?? item.endDate
    const days =
      startDate && endDate
        ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)))
        : 1
    const dailyRate = item.dailyRate ? Number(item.dailyRate) : 0
    const subtotalItem = dailyRate * quantity * days

    await prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity,
        startDate: startDate ?? undefined,
        endDate: endDate ?? undefined,
        subtotal: new Decimal(subtotalItem),
      },
    })

    return this.recalculateCart(cartId)
  }

  /**
   * Remove item from cart.
   */
  static async removeItem(cartId: string, itemId: string): Promise<CartWithItems> {
    await prisma.cartItem.deleteMany({ where: { id: itemId, cartId } })
    return this.recalculateCart(cartId)
  }

  /**
   * Apply coupon to cart. Uses direct Prisma validation for public (no auth required).
   */
  static async applyCoupon(cartId: string, code: string): Promise<CartWithItems> {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    })
    if (!cart) throw new Error('Cart not found')

    const subtotal = Number(cart.subtotal)
    const result = await this.validateCouponForCart(code.trim().toUpperCase(), subtotal, cart.items)

    if (!result.valid) {
      throw new Error(result.error ?? 'Invalid coupon')
    }

    await prisma.cart.update({
      where: { id: cartId },
      data: {
        couponCode: code.trim().toUpperCase(),
        discountAmount: new Decimal(result.discountAmount),
        total: new Decimal(Math.max(0, subtotal - result.discountAmount)),
      },
    })

    return this.getOrCreateCart(cart.userId ?? null, cart.sessionId ?? null)
  }

  /** Validate coupon for cart (no auth). */
  private static async validateCouponForCart(
    code: string,
    amount: number,
    items: { equipmentId: string | null }[]
  ): Promise<{ valid: boolean; discountAmount: number; error?: string }> {
    const coupon = await prisma.coupon.findFirst({
      where: { code, deletedAt: null },
    })
    if (!coupon) return { valid: false, discountAmount: 0, error: 'Coupon not found' }

    const now = new Date()
    if (new Date(coupon.validUntil) < now)
      return { valid: false, discountAmount: 0, error: 'Coupon expired' }
    if (new Date(coupon.validFrom) > now)
      return { valid: false, discountAmount: 0, error: 'Coupon not yet valid' }
    if (coupon.status !== 'ACTIVE')
      return { valid: false, discountAmount: 0, error: 'Coupon inactive' }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)
      return { valid: false, discountAmount: 0, error: 'Coupon usage limit reached' }
    const minAmount = coupon.minimumAmount ? Number(coupon.minimumAmount) : 0
    if (amount < minAmount)
      return { valid: false, discountAmount: 0, error: `Minimum purchase: ${minAmount} SAR` }

    const equipmentIds = items.map((i) => i.equipmentId).filter(Boolean) as string[]
    const applicable = coupon.applicableEquipmentIds as string[] | null
    if (applicable?.length && equipmentIds.length) {
      const match = equipmentIds.some((id) => applicable.includes(id))
      if (!match)
        return { valid: false, discountAmount: 0, error: 'Coupon not applicable to cart items' }
    }

    const isPercent = coupon.type === 'PERCENT'
    const value = isPercent
      ? Number(coupon.discountPercentage ?? 0)
      : Number(coupon.discountValue ?? 0)
    let discountAmount = isPercent ? (amount * value) / 100 : value
    const maxDiscount = coupon.maximumDiscount ? Number(coupon.maximumDiscount) : null
    if (maxDiscount != null && discountAmount > maxDiscount) discountAmount = maxDiscount
    if (discountAmount > amount) discountAmount = amount

    return { valid: true, discountAmount }
  }

  /**
   * Remove coupon from cart.
   */
  static async removeCoupon(cartId: string): Promise<CartWithItems> {
    const cart = await prisma.cart.findUnique({ where: { id: cartId } })
    if (!cart) throw new Error('Cart not found')
    const subtotal = Number(cart.subtotal)
    await prisma.cart.update({
      where: { id: cartId },
      data: { couponCode: null, discountAmount: null, total: new Decimal(subtotal) },
    })
    return this.recalculateCart(cartId)
  }

  /**
   * Revalidate availability of cart items (set isAvailable, lastCheckedAt).
   */
  static async revalidate(cartId: string): Promise<CartWithItems> {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    })
    if (!cart) throw new Error('Cart not found')

    const equipmentIds = [
      ...new Set(
        cart.items
          .filter((i) => i.itemType === 'EQUIPMENT' && i.equipmentId)
          .map((i) => i.equipmentId!)
      ),
    ]
    const equipmentMap = new Map<string, { quantityTotal: number }>()
    if (equipmentIds.length > 0) {
      const equipment = await prisma.equipment.findMany({
        where: { id: { in: equipmentIds } },
        select: { id: true, quantityTotal: true },
      })
      equipment.forEach((e) => equipmentMap.set(e.id, { quantityTotal: e.quantityTotal }))
    }

    const now = new Date()
    for (const item of cart.items) {
      let available = true
      if (item.itemType === 'EQUIPMENT' && item.equipmentId && item.startDate && item.endDate) {
        const booked = await prisma.bookingEquipment.aggregate({
          where: {
            equipmentId: item.equipmentId,
            booking: {
              status: { in: ['CONFIRMED', 'ACTIVE'] },
              deletedAt: null,
              startDate: { lt: item.endDate! },
              endDate: { gt: item.startDate! },
            },
          },
          _sum: { quantity: true },
        })
        const eq = equipmentMap.get(item.equipmentId)
        const bookedQty = booked._sum.quantity ?? 0
        available = eq ? eq.quantityTotal - bookedQty >= item.quantity : false
      }
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { isAvailable: available, lastCheckedAt: now },
      })
    }

    return this.getOrCreateCart(cart.userId ?? null, cart.sessionId ?? null)
  }

  /**
   * Merge guest cart (sessionId) into user cart on login.
   */
  static async syncToUser(sessionCartId: string, userId: string): Promise<CartWithItems> {
    const sessionCart = await prisma.cart.findUnique({
      where: { id: sessionCartId },
      include: { items: true },
    })
    if (!sessionCart || sessionCart.userId) throw new Error('Invalid session cart')

    const userCart = await prisma.cart.findFirst({
      where: { userId },
      include: { items: true },
    })

    if (!userCart) {
      await prisma.cart.update({
        where: { id: sessionCartId },
        data: { userId, sessionId: null },
      })
      return this.recalculateCart(sessionCartId)
    }

    for (const item of sessionCart.items) {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { cartId: userCart.id },
      })
    }
    await prisma.cart.delete({ where: { id: sessionCartId } })
    return this.recalculateCart(userCart.id)
  }

  private static async recalculateCart(cartId: string): Promise<CartWithItems> {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    })
    if (!cart) throw new Error('Cart not found')

    const subtotal = cart.items.reduce((s, i) => s + Number(i.subtotal), 0)
    const discount = cart.discountAmount ? Number(cart.discountAmount) : 0
    const total = Math.max(0, subtotal - discount)

    await prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotal: new Decimal(subtotal),
        total: new Decimal(total),
      },
    })

    const updated = await prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: { include: { studio: { select: { name: true, slug: true } } } } },
    })
    return this.toCartWithItems(updated!)
  }

  private static toCartWithItems(cart: {
    id: string
    userId: string | null
    sessionId: string | null
    couponCode: string | null
    discountAmount: unknown
    subtotal: unknown
    total: unknown
    expiresAt: Date
    items: {
      id: string
      itemType: CartItemType
      equipmentId: string | null
      studioId: string | null
      packageId: string | null
      kitId: string | null
      startDate: Date | null
      endDate: Date | null
      quantity: number
      dailyRate: unknown
      subtotal: unknown
      isAvailable: boolean
      studio?: { name: string; slug: string } | null
    }[]
  }): CartWithItems {
    return {
      id: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      couponCode: cart.couponCode,
      discountAmount: cart.discountAmount ? Number(cart.discountAmount) : 0,
      subtotal: Number(cart.subtotal),
      total: Number(cart.total),
      expiresAt: cart.expiresAt,
      items: cart.items.map((i) => ({
        id: i.id,
        itemType: i.itemType,
        equipmentId: i.equipmentId,
        studioId: i.studioId,
        studioName: i.studio?.name ?? null,
        studioSlug: i.studio?.slug ?? null,
        packageId: i.packageId,
        kitId: i.kitId,
        startDate: i.startDate,
        endDate: i.endDate,
        quantity: i.quantity,
        dailyRate: i.dailyRate ? Number(i.dailyRate) : null,
        subtotal: Number(i.subtotal),
        isAvailable: i.isAvailable,
      })),
    }
  }
}
