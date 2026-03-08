/**
 * Unit tests for cart.store
 */

import { useCartStore } from '../cart.store'

const mockFetch = jest.fn()

describe('cart.store', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = mockFetch
    useCartStore.setState({
      id: null,
      userId: null,
      items: [],
      subtotal: 0,
      total: 0,
      discountAmount: 0,
      couponCode: null,
      error: null,
    })
  })

  describe('initial state', () => {
    it('has empty cart state', () => {
      const state = useCartStore.getState()
      expect(state.id).toBeNull()
      expect(state.items).toEqual([])
      expect(state.subtotal).toBe(0)
      expect(state.total).toBe(0)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('fetchCart', () => {
    it('updates state when API returns cart', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'cart_1',
            userId: 'user_1',
            couponCode: null,
            discountAmount: 0,
            subtotal: 100,
            total: 100,
            items: [
              {
                id: 'item_1',
                itemType: 'EQUIPMENT',
                equipmentId: 'eq_1',
                studioId: null,
                packageId: null,
                kitId: null,
                startDate: null,
                endDate: null,
                quantity: 1,
                dailyRate: 100,
                subtotal: 100,
                isAvailable: true,
              },
            ],
          }),
      })

      await useCartStore.getState().fetchCart()

      expect(useCartStore.getState().id).toBe('cart_1')
      expect(useCartStore.getState().items).toHaveLength(1)
      expect(useCartStore.getState().subtotal).toBe(100)
      expect(useCartStore.getState().total).toBe(100)
    })

    it('sets error when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      })

      await useCartStore.getState().fetchCart()

      expect(useCartStore.getState().error).toBeTruthy()
    })

    it('handles json parse failure in error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('parse error')),
      })

      await useCartStore.getState().fetchCart()

      expect(useCartStore.getState().error).toBeTruthy()
    })
  })

  describe('addItem', () => {
    it('updates state when API succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'cart_1',
            userId: 'user_1',
            couponCode: null,
            discountAmount: 0,
            subtotal: 200,
            total: 200,
            items: [
              {
                id: 'item_1',
                itemType: 'EQUIPMENT',
                equipmentId: 'eq_1',
                studioId: null,
                packageId: null,
                kitId: null,
                startDate: null,
                endDate: null,
                quantity: 2,
                dailyRate: 100,
                subtotal: 200,
                isAvailable: true,
              },
            ],
          }),
      })

      await useCartStore.getState().addItem({
        itemType: 'EQUIPMENT',
        equipmentId: 'eq_1',
        quantity: 2,
        dailyRate: 100,
      })

      expect(useCartStore.getState().items).toHaveLength(1)
      expect(useCartStore.getState().subtotal).toBe(200)
    })

    it('sets error and rethrows when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Out of stock' }),
      })

      await expect(
        useCartStore.getState().addItem({
          itemType: 'EQUIPMENT',
          equipmentId: 'eq_1',
          quantity: 1,
          dailyRate: 100,
        })
      ).rejects.toBeDefined()
      expect(useCartStore.getState().error).toBeTruthy()
    })
  })

  describe('updateItem', () => {
    it('updates state when API succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            couponCode: null,
            discountAmount: 0,
            subtotal: 150,
            total: 150,
            items: [],
          }),
      })

      await useCartStore.getState().updateItem('item_1', { quantity: 2 })

      expect(useCartStore.getState().subtotal).toBe(150)
    })

    it('sets error when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' }),
      })

      await expect(
        useCartStore.getState().updateItem('item_1', { quantity: 2 })
      ).rejects.toBeDefined()
      expect(useCartStore.getState().error).toBe('Not found')
    })
  })

  describe('removeItem', () => {
    it('updates state when API succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            couponCode: null,
            discountAmount: 0,
            subtotal: 0,
            total: 0,
            items: [],
          }),
      })

      await useCartStore.getState().removeItem('item_1')

      expect(useCartStore.getState().items).toEqual([])
    })

    it('sets error when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed' }),
      })

      await expect(useCartStore.getState().removeItem('item_1')).rejects.toBeDefined()
      expect(useCartStore.getState().error).toBe('Failed')
    })
  })

  describe('applyCoupon', () => {
    it('updates discount when API succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            couponCode: 'SAVE10',
            discountAmount: 10,
            total: 90,
          }),
      })

      await useCartStore.getState().applyCoupon('SAVE10')

      expect(useCartStore.getState().couponCode).toBe('SAVE10')
      expect(useCartStore.getState().discountAmount).toBe(10)
      expect(useCartStore.getState().total).toBe(90)
    })

    it('sets error when coupon invalid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid coupon' }),
      })

      await expect(useCartStore.getState().applyCoupon('BAD')).rejects.toBeDefined()
      expect(useCartStore.getState().error).toBe('Invalid coupon')
    })
  })

  describe('removeCoupon', () => {
    it('clears coupon when API succeeds', async () => {
      useCartStore.setState({ couponCode: 'SAVE10', discountAmount: 10, subtotal: 100 })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ total: 100 }),
      })

      await useCartStore.getState().removeCoupon()

      expect(useCartStore.getState().couponCode).toBeNull()
      expect(useCartStore.getState().discountAmount).toBe(0)
    })

    it('sets error when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed' }),
      })

      await expect(useCartStore.getState().removeCoupon()).rejects.toBeDefined()
      expect(useCartStore.getState().error).toBe('Failed')
    })
  })

  describe('revalidate', () => {
    it('updates items when API succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [{ id: 'i1', itemType: 'EQUIPMENT' }] }),
      })

      await useCartStore.getState().revalidate()

      expect(useCartStore.getState().items).toHaveLength(1)
    })

    it('sets error when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed' }),
      })

      await useCartStore.getState().revalidate()

      expect(useCartStore.getState().error).toBe('Failed')
    })
  })

  describe('syncCart', () => {
    it('updates full cart when API succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'cart_2',
            userId: 'user_1',
            couponCode: null,
            discountAmount: 0,
            subtotal: 50,
            total: 50,
            items: [],
          }),
      })

      await useCartStore.getState().syncCart()

      expect(useCartStore.getState().id).toBe('cart_2')
      expect(useCartStore.getState().subtotal).toBe(50)
    })

    it('sets error when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Sync failed' }),
      })

      await useCartStore.getState().syncCart()

      expect(useCartStore.getState().error).toBe('Sync failed')
    })
  })
})
