/**
 * Unit tests for business-recipient.validator
 */

import {
  createBusinessRecipientSchema,
  updateBusinessRecipientSchema,
} from '../business-recipient.validator'

describe('business-recipient.validator', () => {
  describe('createBusinessRecipientSchema', () => {
    it('accepts valid input with phone', () => {
      const result = createBusinessRecipientSchema.safeParse({
        name: 'John',
        role: 'OWNER',
        phone: '+966501234567',
      })
      expect(result.success).toBe(true)
    })
    it('accepts valid input with email', () => {
      const result = createBusinessRecipientSchema.safeParse({
        name: 'John',
        role: 'OWNER',
        email: 'john@example.com',
      })
      expect(result.success).toBe(true)
    })
    it('rejects when no phone, email, or whatsappNumber', () => {
      const result = createBusinessRecipientSchema.safeParse({
        name: 'John',
        role: 'OWNER',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateBusinessRecipientSchema', () => {
    it('accepts partial update', () => {
      const result = updateBusinessRecipientSchema.safeParse({
        name: 'Updated',
      })
      expect(result.success).toBe(true)
    })
  })
})
