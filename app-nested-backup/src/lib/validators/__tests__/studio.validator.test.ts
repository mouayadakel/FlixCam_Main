/**
 * Unit tests for studio.validator
 */

import {
  createStudioSchema,
  updateStudioSchema,
  updateStudioCmsSchema,
} from '../studio.validator'

describe('studio.validator', () => {
  describe('createStudioSchema', () => {
    it('accepts valid input', () => {
      const result = createStudioSchema.safeParse({
        name: 'Studio A',
        hourlyRate: 100,
      })
      expect(result.success).toBe(true)
    })
    it('rejects negative hourlyRate', () => {
      const result = createStudioSchema.safeParse({
        name: 'Studio A',
        hourlyRate: -1,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateStudioSchema', () => {
    it('accepts partial update', () => {
      const result = updateStudioSchema.safeParse({
        name: 'Updated Studio',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('updateStudioCmsSchema', () => {
    it('accepts valid cms update', () => {
      const result = updateStudioCmsSchema.safeParse({
        slotDurationMinutes: 60,
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid slotDurationMinutes', () => {
      const result = updateStudioCmsSchema.safeParse({
        slotDurationMinutes: 45,
      })
      expect(result.success).toBe(false)
    })
  })
})
