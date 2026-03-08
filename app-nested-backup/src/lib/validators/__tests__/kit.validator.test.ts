/**
 * Unit tests for kit.validator
 */

import { createKitSchema, updateKitSchema } from '../kit.validator'

const validCuid = 'cln1234567890123456789012'

describe('kit.validator', () => {
  describe('createKitSchema', () => {
    it('accepts valid input', () => {
      const result = createKitSchema.safeParse({
        name: 'Cinema Kit',
        slug: 'cinema-kit',
        items: [{ equipmentId: validCuid, quantity: 1 }],
      })
      expect(result.success).toBe(true)
    })
    it('rejects when items empty', () => {
      const result = createKitSchema.safeParse({
        name: 'Kit',
        slug: 'kit',
        items: [],
      })
      expect(result.success).toBe(false)
    })
    it('rejects invalid slug', () => {
      const result = createKitSchema.safeParse({
        name: 'Kit',
        slug: 'Invalid Slug',
        items: [{ equipmentId: validCuid }],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateKitSchema', () => {
    it('accepts partial update', () => {
      const result = updateKitSchema.safeParse({
        name: 'Updated Kit',
      })
      expect(result.success).toBe(true)
    })
  })
})
