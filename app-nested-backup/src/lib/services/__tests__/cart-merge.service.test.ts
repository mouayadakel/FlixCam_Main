/**
 * Unit tests for cart-merge.service
 * PATHS: mergeSessionToUser (invalid cart, no user cart, merge with dedup); recalculate
 */

import { CartMergeService } from '../cart-merge.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    cart: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
    cartItem: { update: jest.fn(), delete: jest.fn() },
  },
}))

const mockCartFindUnique = prisma.cart.findUnique as jest.Mock
const mockCartFindFirst = prisma.cart.findFirst as jest.Mock
const mockCartUpdate = prisma.cart.update as jest.Mock
const mockCartDelete = prisma.cart.delete as jest.Mock
const mockCartItemUpdate = prisma.cartItem.update as jest.Mock
const mockCartItemDelete = prisma.cartItem.delete as jest.Mock

describe('CartMergeService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('mergeSessionToUser', () => {
    it('throws when session cart not found', async () => {
      mockCartFindUnique.mockResolvedValue(null)
      await expect(CartMergeService.mergeSessionToUser('sc1', 'user_1')).rejects.toThrow('Invalid session cart')
    })

    it('throws when session cart has userId', async () => {
      mockCartFindUnique.mockResolvedValue({ id: 'sc1', userId: 'other', items: [] })
      await expect(CartMergeService.mergeSessionToUser('sc1', 'user_1')).rejects.toThrow('Invalid session cart')
    })

    it('reassigns session cart to user when user has no cart', async () => {
      mockCartFindUnique
        .mockResolvedValueOnce({ id: 'sc1', userId: null, sessionId: 's1', items: [] })
        .mockResolvedValueOnce({ id: 'sc1', items: [], discountAmount: null })
      mockCartFindFirst.mockResolvedValue(null)
      mockCartUpdate.mockResolvedValue({})
      await CartMergeService.mergeSessionToUser('sc1', 'user_1')
      expect(mockCartUpdate).toHaveBeenCalledWith({
        where: { id: 'sc1' },
        data: { userId: 'user_1', sessionId: null },
      })
    })

    it('merges items when user has cart', async () => {
      const sessionCart = {
        id: 'sc1',
        userId: null,
        items: [{ id: 'si1', equipmentId: 'eq_1', itemType: 'equipment', quantity: 1, subtotal: 100 }],
      }
      const userCart = {
        id: 'uc1',
        userId: 'user_1',
        items: [],
      }
      mockCartFindUnique
        .mockResolvedValueOnce(sessionCart)
        .mockResolvedValueOnce({ id: 'uc1', items: [{ subtotal: 100 }], discountAmount: null })
      mockCartFindFirst.mockResolvedValue(userCart)
      mockCartItemUpdate.mockResolvedValue({})
      mockCartDelete.mockResolvedValue({})
      await CartMergeService.mergeSessionToUser('sc1', 'user_1')
      expect(mockCartItemUpdate).toHaveBeenCalledWith({
        where: { id: 'si1' },
        data: { cartId: 'uc1' },
      })
      expect(mockCartDelete).toHaveBeenCalledWith({ where: { id: 'sc1' } })
    })

    it('deduplicates by equipmentId: updates existing item and deletes session item', async () => {
      const sessionItem = { id: 'si1', equipmentId: 'eq_1', itemType: 'equipment', quantity: 2, subtotal: 200 }
      const existingItem = { id: 'ui1', equipmentId: 'eq_1', itemType: 'equipment', quantity: 1, subtotal: 100 }
      const sessionCart = { id: 'sc1', userId: null, items: [sessionItem] }
      const userCart = { id: 'uc1', userId: 'user_1', items: [existingItem] }
      mockCartFindUnique
        .mockResolvedValueOnce(sessionCart)
        .mockResolvedValueOnce({ id: 'uc1', items: [{ subtotal: 300 }], discountAmount: null })
      mockCartFindFirst.mockResolvedValue(userCart)
      mockCartItemUpdate.mockResolvedValue({})
      mockCartItemDelete.mockResolvedValue({})
      mockCartDelete.mockResolvedValue({})
      await CartMergeService.mergeSessionToUser('sc1', 'user_1')
      expect(mockCartItemUpdate).toHaveBeenCalledWith({
        where: { id: 'ui1' },
        data: {
          quantity: 3,
          subtotal: expect.anything(),
        },
      })
      expect(mockCartItemDelete).toHaveBeenCalledWith({ where: { id: 'si1' } })
      expect(mockCartDelete).toHaveBeenCalledWith({ where: { id: 'sc1' } })
    })
  })

  describe('recalculate', () => {
    it('throws when cart not found', async () => {
      mockCartFindUnique.mockResolvedValue(null)
      await expect(CartMergeService.recalculate('missing')).rejects.toThrow('Cart not found')
    })

    it('returns subtotal, total, itemCount', async () => {
      mockCartFindUnique.mockResolvedValue({
        id: 'c1',
        items: [{ subtotal: 100 }, { subtotal: 50 }],
        discountAmount: 0,
      })
      mockCartUpdate.mockResolvedValue({})
      const result = await CartMergeService.recalculate('c1')
      expect(result).toEqual({ cartId: 'c1', subtotal: 150, total: 150, itemCount: 2 })
      expect(mockCartUpdate).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: expect.objectContaining({ subtotal: expect.anything(), total: expect.anything() }),
      })
    })
  })
})
