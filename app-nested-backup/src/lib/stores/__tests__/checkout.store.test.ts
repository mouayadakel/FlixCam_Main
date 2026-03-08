/**
 * Unit tests for checkout.store
 */

import { useCheckoutStore } from '../checkout.store'

describe('checkout.store', () => {
  beforeEach(() => {
    useCheckoutStore.setState({
      step: 1,
      details: null,
      dates: null,
      fulfillment: null,
      addons: {},
      paymentMethod: null,
      holdId: null,
      holdExpiresAt: null,
    })
  })

  describe('initial state', () => {
    it('has step 1', () => {
      expect(useCheckoutStore.getState().step).toBe(1)
    })
  })

  describe('setStep', () => {
    it('updates step', () => {
      useCheckoutStore.getState().setStep(2)
      expect(useCheckoutStore.getState().step).toBe(2)
    })
  })

  describe('setDetails', () => {
    it('stores details', () => {
      const details = {
        name: 'Ahmed',
        email: 'ahmed@example.com',
        phone: '0512345678',
        deliveryMethod: 'PICKUP' as const,
        deliveryAddress: null,
      }
      useCheckoutStore.getState().setDetails(details)
      expect(useCheckoutStore.getState().details).toEqual(details)
    })
  })

  describe('setDates', () => {
    it('stores dates', () => {
      const dates = { startDate: '2026-03-01', endDate: '2026-03-05' }
      useCheckoutStore.getState().setDates(dates)
      expect(useCheckoutStore.getState().dates).toEqual(dates)
    })
  })

  describe('setFulfillment', () => {
    it('stores fulfillment', () => {
      const fulfillment = {
        method: 'PICKUP' as const,
        branchId: 'br_1',
      }
      useCheckoutStore.getState().setFulfillment(fulfillment)
      expect(useCheckoutStore.getState().fulfillment).toEqual(fulfillment)
    })
  })

  describe('setAddons', () => {
    it('stores addons', () => {
      const addons = { insuranceTier: 'standard', technician: true }
      useCheckoutStore.getState().setAddons(addons)
      expect(useCheckoutStore.getState().addons).toEqual(addons)
    })
  })

  describe('setPaymentMethod', () => {
    it('stores payment method', () => {
      useCheckoutStore.getState().setPaymentMethod('card')
      expect(useCheckoutStore.getState().paymentMethod).toBe('card')
    })
  })

  describe('setHold', () => {
    it('stores hold id and expiry', () => {
      useCheckoutStore.getState().setHold('hold_1', '2026-03-02T12:00:00Z')
      expect(useCheckoutStore.getState().holdId).toBe('hold_1')
      expect(useCheckoutStore.getState().holdExpiresAt).toBe('2026-03-02T12:00:00Z')
    })
  })

  describe('setFormValues', () => {
    it('stores form values', () => {
      const values = { field1: 'value1' }
      useCheckoutStore.getState().setFormValues(values)
      expect(useCheckoutStore.getState().formValues).toEqual(values)
    })
  })

  describe('clearCheckout', () => {
    it('resets state', () => {
      useCheckoutStore.getState().setStep(2)
      useCheckoutStore.getState().clearCheckout()
      expect(useCheckoutStore.getState().step).toBe(1)
    })
  })

  describe('persist partialize', () => {
    it('persists all partialized fields when state changes', () => {
      const { setStep, setDates, setFulfillment, setAddons, setPaymentMethod, setHold, setFormValues } =
        useCheckoutStore.getState()
      setStep(2)
      setDates({ startDate: '2026-03-01', endDate: '2026-03-05' })
      setFulfillment({ method: 'PICKUP', branchId: 'br_1' })
      setAddons({ insuranceTier: 'standard' })
      setPaymentMethod('card')
      setHold('hold_1', '2026-03-02T12:00:00Z')
      setFormValues({ field1: 'value1' })
      const state = useCheckoutStore.getState()
      expect(state.step).toBe(2)
      expect(state.dates).toEqual({ startDate: '2026-03-01', endDate: '2026-03-05' })
      expect(state.fulfillment).toEqual({ method: 'PICKUP', branchId: 'br_1' })
      expect(state.addons).toEqual({ insuranceTier: 'standard' })
      expect(state.paymentMethod).toBe('card')
      expect(state.holdId).toBe('hold_1')
      expect(state.holdExpiresAt).toBe('2026-03-02T12:00:00Z')
      expect(state.formValues).toEqual({ field1: 'value1' })
    })
  })
})
