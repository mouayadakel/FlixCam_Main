/**
 * Cart store (Phase 3.1). Fetches from API; supports add, update, remove, coupon, revalidate.
 */

import { create } from 'zustand'

export interface CartItem {
  id: string
  itemType: string
  equipmentId: string | null
  studioId: string | null
  packageId: string | null
  kitId: string | null
  startDate: string | null
  endDate: string | null
  quantity: number
  dailyRate: number | null
  subtotal: number
  isAvailable: boolean
}

export interface CartState {
  id: string | null
  userId: string | null
  couponCode: string | null
  discountAmount: number
  subtotal: number
  total: number
  items: CartItem[]
  isLoading: boolean
  error: string | null
  fetchCart: () => Promise<void>
  addItem: (body: {
    itemType: 'EQUIPMENT' | 'STUDIO' | 'PACKAGE' | 'KIT'
    equipmentId?: string
    studioId?: string
    kitId?: string
    startDate?: string
    endDate?: string
    quantity?: number
    dailyRate?: number
  }) => Promise<void>
  updateItem: (itemId: string, data: { quantity?: number; startDate?: string; endDate?: string }) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  applyCoupon: (code: string) => Promise<void>
  removeCoupon: () => Promise<void>
  revalidate: () => Promise<void>
  syncCart: () => Promise<void>
}

interface CartApiResponse {
  id: string
  userId: string | null
  couponCode: string | null
  discountAmount: number
  subtotal: number
  total: number
  items: CartItem[]
}

async function apiGetCart(): Promise<CartApiResponse> {
  const res = await fetch('/api/cart')
  if (!res.ok) throw new Error(await res.json().then((j: { error?: string }) => j.error).catch(() => 'Failed to fetch cart'))
  return res.json()
}

export const useCartStore = create<CartState>((set, get) => ({
  id: null,
  userId: null,
  couponCode: null,
  discountAmount: 0,
  subtotal: 0,
  total: 0,
  items: [],
  isLoading: false,
  error: null,

  fetchCart: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await apiGetCart()
      set({
        id: data.id,
        userId: data.userId,
        couponCode: data.couponCode,
        discountAmount: data.discountAmount ?? 0,
        subtotal: data.subtotal ?? 0,
        total: data.total ?? 0,
        items: data.items ?? [],
        isLoading: false,
        error: null,
      })
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed',
        isLoading: false,
      })
    }
  },

  addItem: async (body) => {
    set({ error: null })
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      set({
        id: data.id,
        userId: data.userId,
        couponCode: data.couponCode,
        discountAmount: data.discountAmount ?? 0,
        subtotal: data.subtotal ?? 0,
        total: data.total ?? 0,
        items: data.items ?? [],
      })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to add' })
      throw e
    }
  },

  updateItem: async (itemId, data) => {
    set({ error: null })
    try {
      const res = await fetch(`/api/cart/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const updated = await res.json()
      if (!res.ok) throw new Error(updated.error)
      set({
        couponCode: updated.couponCode,
        discountAmount: updated.discountAmount ?? 0,
        subtotal: updated.subtotal ?? 0,
        total: updated.total ?? 0,
        items: updated.items ?? [],
      })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to update' })
      throw e
    }
  },

  removeItem: async (itemId) => {
    set({ error: null })
    try {
      const res = await fetch(`/api/cart/${itemId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      set({
        couponCode: data.couponCode,
        discountAmount: data.discountAmount ?? 0,
        subtotal: data.subtotal ?? 0,
        total: data.total ?? 0,
        items: data.items ?? [],
      })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to remove' })
      throw e
    }
  },

  applyCoupon: async (code) => {
    set({ error: null })
    try {
      const res = await fetch('/api/cart/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      set({
        couponCode: data.couponCode,
        discountAmount: data.discountAmount ?? 0,
        total: data.total ?? 0,
      })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Invalid coupon' })
      throw e
    }
  },

  removeCoupon: async () => {
    set({ error: null })
    try {
      const res = await fetch('/api/cart/coupon', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      set({
        couponCode: null,
        discountAmount: 0,
        total: data.total ?? get().subtotal,
      })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed' })
      throw e
    }
  },

  revalidate: async () => {
    set({ error: null })
    try {
      const res = await fetch('/api/cart/revalidate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      set({ items: data.items ?? get().items })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to revalidate' })
    }
  },

  syncCart: async () => {
    set({ error: null })
    try {
      const res = await fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      set({
        id: data.id,
        userId: data.userId,
        couponCode: data.couponCode,
        discountAmount: data.discountAmount ?? 0,
        subtotal: data.subtotal ?? 0,
        total: data.total ?? 0,
        items: data.items ?? [],
      })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to sync' })
    }
  },
}))
