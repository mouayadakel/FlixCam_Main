/**
 * Unit tests for booking validators (Phase 8.1) – portal request/cancel schemas.
 */

import {
  requestChangeSchema,
  requestExtensionSchema,
  cancelBookingSchema,
} from '../booking.validator'

describe('booking.validator', () => {
  describe('requestChangeSchema', () => {
    it('accepts valid reason only', () => {
      const result = requestChangeSchema.safeParse({ reason: 'تعديل التواريخ' })
      expect(result.success).toBe(true)
    })

    it('accepts reason with optional requestedChanges', () => {
      const result = requestChangeSchema.safeParse({
        reason: 'تعديل',
        requestedChanges: { startDate: new Date('2026-03-01'), endDate: new Date('2026-03-05') },
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty reason', () => {
      const result = requestChangeSchema.safeParse({ reason: '' })
      expect(result.success).toBe(false)
    })

    it('rejects reason over 500 chars', () => {
      const result = requestChangeSchema.safeParse({ reason: 'x'.repeat(501) })
      expect(result.success).toBe(false)
    })
  })

  describe('requestExtensionSchema', () => {
    it('rejects requestedEndDate in the past', () => {
      const past = new Date('2020-01-01')
      const result = requestExtensionSchema.safeParse({
        reason: 'تمديد',
        requestedEndDate: past,
      })
      expect(result.success).toBe(false)
    })

    it('accepts valid future requestedEndDate and reason', () => {
      const future = new Date(Date.now() + 86400000)
      const result = requestExtensionSchema.safeParse({
        reason: 'تمديد أسبوع',
        requestedEndDate: future,
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty reason', () => {
      const result = requestExtensionSchema.safeParse({
        reason: '',
        requestedEndDate: new Date(Date.now() + 86400000),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('cancelBookingSchema', () => {
    it('accepts empty body (optional reason)', () => {
      const result = cancelBookingSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('accepts optional reason', () => {
      const result = cancelBookingSchema.safeParse({ reason: 'تغيير الخطط' })
      expect(result.success).toBe(true)
    })

    it('rejects reason over 500 chars', () => {
      const result = cancelBookingSchema.safeParse({ reason: 'x'.repeat(501) })
      expect(result.success).toBe(false)
    })
  })
})
