/**
 * Cart Merge Service – extracted from CartService for cleaner separation.
 * Handles merging guest (session-based) carts into authenticated user carts.
 */

import { prisma } from '@/lib/db/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export const CartMergeService = {
  /**
   * Merge a guest session cart into an authenticated user's cart.
   * - If user has no cart, reassign session cart to user.
   * - If user has a cart, move all session cart items into user cart, then delete session cart.
   */
  async mergeSessionToUser(sessionCartId: string, userId: string) {
    const sessionCart = await prisma.cart.findUnique({
      where: { id: sessionCartId },
      include: { items: true },
    })
    if (!sessionCart || sessionCart.userId) {
      throw new Error('Invalid session cart')
    }

    const userCart = await prisma.cart.findFirst({
      where: { userId },
      include: { items: true },
    })

    if (!userCart) {
      // No user cart – reassign session cart
      await prisma.cart.update({
        where: { id: sessionCartId },
        data: { userId, sessionId: null },
      })
      return this.recalculate(sessionCartId)
    }

    // Merge items: move session items into user cart, deduplicating by equipmentId
    for (const sessionItem of sessionCart.items) {
      const existingItem = userCart.items.find(
        (ui) =>
          ui.equipmentId &&
          ui.equipmentId === sessionItem.equipmentId &&
          ui.itemType === sessionItem.itemType
      )

      if (existingItem) {
        // Update quantity on existing item
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + sessionItem.quantity,
            subtotal: new Decimal(Number(existingItem.subtotal) + Number(sessionItem.subtotal)),
          },
        })
        // Delete the duplicate session item
        await prisma.cartItem.delete({ where: { id: sessionItem.id } })
      } else {
        // Move item to user cart
        await prisma.cartItem.update({
          where: { id: sessionItem.id },
          data: { cartId: userCart.id },
        })
      }
    }

    // Delete now-empty session cart
    await prisma.cart.delete({ where: { id: sessionCartId } })

    return this.recalculate(userCart.id)
  },

  async recalculate(cartId: string) {
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

    return { cartId, subtotal, total, itemCount: cart.items.length }
  },
}
