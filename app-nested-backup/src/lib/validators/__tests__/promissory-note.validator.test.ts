/**
 * Unit tests for promissory-note.validator
 */

import { createBookingPromissoryNoteSchema } from '../promissory-note.validator'

const validCuid = 'clxxxxxxxxxxxxxxxxxxxxxxxxxx'

describe('promissory-note.validator', () => {
  describe('createBookingPromissoryNoteSchema', () => {
    it('accepts valid input', () => {
      const result = createBookingPromissoryNoteSchema.safeParse({
        bookingId: validCuid,
        termsAccepted: true,
        damagePolicyAccepted: true,
        lateFeesAccepted: true,
        signatureData: 'data:image/png;base64,abc123',
      })
      expect(result.success).toBe(true)
    })
    it('rejects when termsAccepted is false', () => {
      const result = createBookingPromissoryNoteSchema.safeParse({
        bookingId: validCuid,
        termsAccepted: false,
        damagePolicyAccepted: true,
        lateFeesAccepted: true,
        signatureData: 'sig',
      })
      expect(result.success).toBe(false)
    })
    it('rejects when damagePolicyAccepted is false', () => {
      const result = createBookingPromissoryNoteSchema.safeParse({
        bookingId: validCuid,
        termsAccepted: true,
        damagePolicyAccepted: false,
        lateFeesAccepted: true,
        signatureData: 'sig',
      })
      expect(result.success).toBe(false)
    })
    it('rejects when lateFeesAccepted is false', () => {
      const result = createBookingPromissoryNoteSchema.safeParse({
        bookingId: validCuid,
        termsAccepted: true,
        damagePolicyAccepted: true,
        lateFeesAccepted: false,
        signatureData: 'sig',
      })
      expect(result.success).toBe(false)
    })
    it('rejects empty signatureData', () => {
      const result = createBookingPromissoryNoteSchema.safeParse({
        bookingId: validCuid,
        termsAccepted: true,
        damagePolicyAccepted: true,
        lateFeesAccepted: true,
        signatureData: '',
      })
      expect(result.success).toBe(false)
    })
  })
})
