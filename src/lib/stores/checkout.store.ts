/**
 * Checkout form state (Phase 3.3). Step, dates, fulfillment, addons, payment, hold.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

export interface CheckoutDates {
  startDate: string
  endDate: string
}

export interface CheckoutFulfillment {
  method: DeliveryMethod
  branchId?: string
  deliveryZone?: string
  address?: DeliveryAddress
}

export interface CheckoutAddons {
  insuranceTier?: string
  technician?: boolean
  deliveryFee?: number
}

/** 1 = Receiver & Fulfillment, 2 = Add-ons, 3 = Review & Pay */
export type CheckoutStepIndex = 1 | 2 | 3

interface CheckoutState {
  details: CheckoutDetails | null
  setDetails: (details: CheckoutDetails) => void
  clearDetails: () => void
  step: CheckoutStepIndex
  setStep: (step: CheckoutStepIndex) => void
  dates: CheckoutDates | null
  setDates: (dates: CheckoutDates) => void
  fulfillment: CheckoutFulfillment | null
  setFulfillment: (f: CheckoutFulfillment) => void
  addons: CheckoutAddons
  setAddons: (addons: CheckoutAddons) => void
  paymentMethod: string | null
  setPaymentMethod: (method: string) => void
  holdId: string | null
  holdExpiresAt: string | null
  setHold: (holdId: string | null, holdExpiresAt: string | null) => void
  /** Dynamic CMS form field values (keyed by fieldKey) */
  formValues: Record<string, unknown>
  setFormValues: (values: Record<string, unknown>) => void
  clearHold: () => void
  clearCheckout: () => void
}

const defaultDetails: CheckoutDetails = {
  name: '',
  email: '',
  phone: '',
  deliveryMethod: 'PICKUP',
  deliveryAddress: null,
}

const defaultAddons: CheckoutAddons = {}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      details: null,
      setDetails: (details) => set({ details }),
      clearDetails: () => set({ details: null }),
      step: 1,
      setStep: (step) => set({ step }),
      dates: null,
      setDates: (dates) => set({ dates }),
      fulfillment: null,
      setFulfillment: (fulfillment) => set({ fulfillment }),
      addons: defaultAddons,
      setAddons: (addons) => set({ addons }),
      paymentMethod: null,
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      holdId: null,
      holdExpiresAt: null,
      setHold: (holdId, holdExpiresAt) => set({ holdId, holdExpiresAt }),
      formValues: {},
      setFormValues: (formValues) => set({ formValues }),
      clearHold: () => set({ holdId: null, holdExpiresAt: null }),
      clearCheckout: () =>
        set({
          details: null,
          step: 1,
          dates: null,
          fulfillment: null,
          addons: defaultAddons,
          paymentMethod: null,
          holdId: null,
          holdExpiresAt: null,
          formValues: {},
        }),
    }),
    {
      name: 'flixcam-checkout',
      partialize: (s) => ({
        step: s.step,
        dates: s.dates,
        fulfillment: s.fulfillment,
        addons: s.addons,
        paymentMethod: s.paymentMethod,
        holdId: s.holdId,
        holdExpiresAt: s.holdExpiresAt,
        formValues: s.formValues,
      }),
    }
  )
)
