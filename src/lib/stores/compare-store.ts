/**
 * Compare store — persisted selection of 2–4 equipment items for side-by-side comparison.
 * Used by CompareButton, CompareBar, and the /compare page.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CompareItem {
  id: string
  name: string
  slug: string
  image: string | null
  price: number | null
  category: string
}

interface CompareStore {
  items: CompareItem[]
  addItem: (item: CompareItem) => void
  removeItem: (id: string) => void
  clearAll: () => void
  hasItem: (id: string) => boolean
  isFull: () => boolean
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        if (get().items.length >= 4) return
        if (get().hasItem(item.id)) return
        set((s) => ({ items: [...s.items, item] }))
      },
      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clearAll: () => set({ items: [] }),
      hasItem: (id) => get().items.some((i) => i.id === id),
      isFull: () => get().items.length >= 4,
    }),
    { name: 'flixcam-compare' }
  )
)
