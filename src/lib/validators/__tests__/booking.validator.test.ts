/**
 * ═══════════════════════════════════════════════════════
 * FILE: src/lib/validators/booking.validator.ts
 * FEATURE: Booking validation
 * UNITS: requestChangeSchema, requestExtensionSchema, cancelBookingSchema
 * ═══════════════════════════════════════════════════════
 *
 * REQUIREMENTS (requestChangeSchema):
 *   - reason required, non-empty, max 500 chars; requestedChanges optional.
 * REQUIREMENTS (requestExtensionSchema):
 *   - reason required; requestedEndDate required and must be in future.
 * REQUIREMENTS (cancelBookingSchema):
 *   - reason required, non-empty.
 */

import {
  createBookingSchema,
  updateBookingSchema,
  stateTransitionSchema,
  requestChangeSchema,
  requestExtensionSchema,
  cancelBookingSchema,
} from '../booking.validator'
import { BookingStatus } from '@prisma/client'

describe('booking.validator', () => {
  describe('createBookingSchema', () => {
    it('accepts valid input with endDate after startDate', () => {
      const result = createBookingSchema.safeParse({
        customerId: 'cust-1',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-05'),
        equipmentIds: ['eq-1'],
      })
      expect(result.success).toBe(true)
    })

    it('rejects when endDate is before or equal to startDate', () => {
      const result = createBookingSchema.safeParse({
        customerId: 'cust-1',
        startDate: new Date('2026-03-05'),
        endDate: new Date('2026-03-01'),
        equipmentIds: ['eq-1'],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('endDate'))).toBe(true)
      }
    })

    it('rejects empty equipmentIds', () => {
      const result = createBookingSchema.safeParse({
        customerId: 'cust-1',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-05'),
        equipmentIds: [],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateBookingSchema', () => {
    it('accepts partial update with no dates', () => {
      const result = updateBookingSchema.safeParse({ notes: 'Updated' })
      expect(result.success).toBe(true)
    })

    it('accepts update with both dates when endDate > startDate', () => {
      const result = updateBookingSchema.safeParse({
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-10'),
      })
      expect(result.success).toBe(true)
    })

    it('rejects update when both dates provided and endDate <= startDate', () => {
      const result = updateBookingSchema.safeParse({
        startDate: new Date('2026-03-10'),
        endDate: new Date('2026-03-01'),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('endDate'))).toBe(true)
      }
    })
  })

  describe('stateTransitionSchema', () => {
    it('accepts valid toState and optional reason', () => {
      const result = stateTransitionSchema.safeParse({
        toState: BookingStatus.CONFIRMED,
        reason: 'Payment received',
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid toState', () => {
      const result = stateTransitionSchema.safeParse({
        toState: 'INVALID_STATE',
        reason: 'Test',
      })
      expect(result.success).toBe(false)
    })
  })

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
