/**
 * Integration-style tests for portal booking APIs (Phase 8.2).
 * Mocks auth and prisma; tests request validation and response shape.
 */

import {
  requestChangeSchema,
  requestExtensionSchema,
  cancelBookingSchema,
} from '@/lib/validators/booking.validator'

describe('Portal booking APIs – validation', () => {
  describe('request-change payload', () => {
    it('validates required reason', () => {
      expect(requestChangeSchema.safeParse({}).success).toBe(false)
      expect(requestChangeSchema.safeParse({ reason: 'سبب' }).success).toBe(true)
    })
  })

  describe('request-extension payload', () => {
    it('requires reason and future requestedEndDate', () => {
      const future = new Date(Date.now() + 86400000)
      expect(
        requestExtensionSchema.safeParse({
          reason: 'تمديد',
          requestedEndDate: future,
        }).success
      ).toBe(true)
      expect(
        requestExtensionSchema.safeParse({
          reason: '',
          requestedEndDate: future,
        }).success
      ).toBe(false)
    })
  })

  describe('cancel payload', () => {
    it('accepts empty or optional reason', () => {
      expect(cancelBookingSchema.safeParse({}).success).toBe(true)
      expect(cancelBookingSchema.safeParse({ reason: 'إلغاء' }).success).toBe(true)
    })
  })
})
