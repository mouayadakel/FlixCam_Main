/**
 * Checkout form state (Phase 3.3). Profile + delivery for step 2; consumed by step 3.
 */

import { create } from 'zustand'

export type DeliveryMethod = 'PICKUP' | 'DELIVERY'

export interface DeliveryAddress {
  city: string
  street: string
  notes?: string
}

export interface CheckoutDetails {
  name: string
  email: string
  phone: string
  deliveryMethod: DeliveryMethod
  deliveryAddress: DeliveryAddress | null
}

interface CheckoutState {
  details: CheckoutDetails | null
  setDetails: (details: CheckoutDetails) => void
  clearDetails: () => void
}

const defaultDetails: CheckoutDetails = {
  name: '',
  email: '',
  phone: '',
  deliveryMethod: 'PICKUP',
  deliveryAddress: null,
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  details: null,
  setDetails: (details) => set({ details }),
  clearDetails: () => set({ details: null }),
}))
