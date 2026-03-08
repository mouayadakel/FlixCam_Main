/**
 * Unit tests for review.validator
 */

import {
  createReviewSchema,
  updateReviewSchema,
  respondToReviewSchema,
} from '../review.validator'

const validCuid = 'clxxxxxxxxxxxxxxxxxxxxxxxxxx'

describe('review.validator', () => {
  describe('createReviewSchema', () => {
    it('accepts valid input', () => {
      const result = createReviewSchema.safeParse({
        bookingId: validCuid,
        userId: validCuid,
        rating: 5,
      })
      expect(result.success).toBe(true)
    })
    it('accepts with comment', () => {
      const result = createReviewSchema.safeParse({
        bookingId: validCuid,
        userId: validCuid,
        rating: 4,
        comment: 'Great experience!',
      })
      expect(result.success).toBe(true)
    })
    it('rejects rating below 1', () => {
      const result = createReviewSchema.safeParse({
        bookingId: validCuid,
        userId: validCuid,
        rating: 0,
      })
      expect(result.success).toBe(false)
    })
    it('rejects rating above 5', () => {
      const result = createReviewSchema.safeParse({
        bookingId: validCuid,
        userId: validCuid,
        rating: 6,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateReviewSchema', () => {
    it('accepts status update', () => {
      const result = updateReviewSchema.safeParse({
        status: 'APPROVED',
        adminResponse: 'Thank you!',
      })
      expect(result.success).toBe(true)
    })
    it('accepts empty object', () => {
      const result = updateReviewSchema.safeParse({})
      expect(result.success).toBe(true)
    })
    it('rejects invalid status', () => {
      const result = updateReviewSchema.safeParse({ status: 'INVALID' })
      expect(result.success).toBe(false)
    })
  })

  describe('respondToReviewSchema', () => {
    it('accepts valid response', () => {
      const result = respondToReviewSchema.safeParse({
        adminResponse: 'Thank you for your feedback.',
      })
      expect(result.success).toBe(true)
    })
    it('rejects empty adminResponse', () => {
      const result = respondToReviewSchema.safeParse({
        adminResponse: '',
      })
      expect(result.success).toBe(false)
    })
  })
})
