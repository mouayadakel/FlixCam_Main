/**
 * Unit tests for receiver.validator
 */

import { createReceiverSchema, updateReceiverSchema } from '../receiver.validator'

describe('receiver.validator', () => {
  const validCreate = {
    name: 'John Doe',
    idNumber: '1234567890',
    phone: '0512345678',
    idPhotoUrl: 'https://example.com/photo.jpg',
  }

  describe('createReceiverSchema', () => {
    it('accepts valid Saudi phone 05xxxxxxxx', () => {
      const result = createReceiverSchema.safeParse(validCreate)
      expect(result.success).toBe(true)
    })

    it('accepts valid Saudi phone 9665xxxxxxxx', () => {
      const result = createReceiverSchema.safeParse({ ...validCreate, phone: '966512345678' })
      expect(result.success).toBe(true)
    })

    it('rejects when name too short', () => {
      const result = createReceiverSchema.safeParse({ ...validCreate, name: 'A' })
      expect(result.success).toBe(false)
    })

    it('rejects when idNumber missing', () => {
      const result = createReceiverSchema.safeParse({ ...validCreate, idNumber: '' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid phone format', () => {
      const result = createReceiverSchema.safeParse({ ...validCreate, phone: '1234567890' })
      expect(result.success).toBe(false)
    })

    it('rejects when idPhotoUrl missing', () => {
      const result = createReceiverSchema.safeParse({ ...validCreate, idPhotoUrl: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('updateReceiverSchema', () => {
    it('accepts partial input', () => {
      const result = updateReceiverSchema.safeParse({ name: 'Updated' })
      expect(result.success).toBe(true)
    })
  })
})
