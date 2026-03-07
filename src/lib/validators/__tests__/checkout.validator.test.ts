/**
 * Unit tests for checkout.validator
 */

import { checkoutDetailsSchema } from '../checkout.validator'

describe('checkout.validator', () => {
  describe('checkoutDetailsSchema', () => {
    it('accepts valid PICKUP input', () => {
      const result = checkoutDetailsSchema.safeParse({
        name: 'Ahmed',
        email: 'ahmed@example.com',
        phone: '0512345678',
        deliveryMethod: 'PICKUP',
      })
      expect(result.success).toBe(true)
    })
    it('accepts valid DELIVERY input with delivery fields', () => {
      const result = checkoutDetailsSchema.safeParse({
        name: 'Ahmed',
        email: 'ahmed@example.com',
        phone: '966512345678',
        deliveryMethod: 'DELIVERY',
        deliveryCity: 'Riyadh',
        deliveryStreet: 'King Fahd Road',
      })
      expect(result.success).toBe(true)
    })
    it('rejects DELIVERY when deliveryCity missing', () => {
      const result = checkoutDetailsSchema.safeParse({
        name: 'Ahmed',
        email: 'ahmed@example.com',
        phone: '0512345678',
        deliveryMethod: 'DELIVERY',
        deliveryStreet: 'King Fahd Road',
      })
      expect(result.success).toBe(false)
    })
    it('rejects when name empty', () => {
      const result = checkoutDetailsSchema.safeParse({
        name: '',
        email: 'ahmed@example.com',
        phone: '0512345678',
        deliveryMethod: 'PICKUP',
      })
      expect(result.success).toBe(false)
    })
    it('rejects when email invalid', () => {
      const result = checkoutDetailsSchema.safeParse({
        name: 'Ahmed',
        email: 'invalid-email',
        phone: '0512345678',
        deliveryMethod: 'PICKUP',
      })
      expect(result.success).toBe(false)
    })
    it('rejects when phone invalid', () => {
      const result = checkoutDetailsSchema.safeParse({
        name: 'Ahmed',
        email: 'ahmed@example.com',
        phone: '123',
        deliveryMethod: 'PICKUP',
      })
      expect(result.success).toBe(false)
    })
  })
})
