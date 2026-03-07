/**
 * Unit tests for payment.validator
 */

import {
  createPaymentSchema,
  updatePaymentSchema,
  paymentRefundSchema,
  paymentFilterSchema,
  paymentStatusSchema,
} from '../payment.validator'

describe('payment.validator', () => {
  describe('paymentStatusSchema', () => {
    it('accepts valid PaymentStatus enum values', () => {
      expect(paymentStatusSchema.safeParse('PENDING').success).toBe(true)
      expect(paymentStatusSchema.safeParse('SUCCESS').success).toBe(true)
    })
    it('rejects invalid status', () => {
      expect(paymentStatusSchema.safeParse('invalid').success).toBe(false)
    })
  })

  describe('createPaymentSchema', () => {
    it('accepts valid input', () => {
      const result = createPaymentSchema.safeParse({
        bookingId: 'bk_1',
        amount: 100.5,
      })
      expect(result.success).toBe(true)
    })
    it('rejects when amount zero', () => {
      const result = createPaymentSchema.safeParse({
        bookingId: 'bk_1',
        amount: 0,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('paymentRefundSchema', () => {
    it('accepts valid input', () => {
      const result = paymentRefundSchema.safeParse({
        refundAmount: 50,
        refundReason: 'Customer request',
      })
      expect(result.success).toBe(true)
    })
    it('defaults requiresApproval to true when omitted', () => {
      const result = paymentRefundSchema.safeParse({
        refundAmount: 50,
        refundReason: 'Customer request',
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.requiresApproval).toBe(true)
    })
    it('rejects when refundReason empty', () => {
      const result = paymentRefundSchema.safeParse({
        refundAmount: 50,
        refundReason: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('paymentFilterSchema', () => {
    it('accepts valid filter', () => {
      const result = paymentFilterSchema.safeParse({
        status: 'SUCCESS',
        bookingId: 'bk_1',
      })
      expect(result.success).toBe(true)
    })
    it('accepts date range and amount filters', () => {
      expect(
        paymentFilterSchema.safeParse({
          dateFrom: '2026-01-01',
          dateTo: '2026-12-31',
          minAmount: 10,
          maxAmount: 1000,
          hasRefund: true,
          page: 1,
          pageSize: 20,
        }).success
      ).toBe(true)
    })
  })

  describe('updatePaymentSchema', () => {
    it('accepts partial update', () => {
      expect(updatePaymentSchema.safeParse({ status: 'SUCCESS' }).success).toBe(true)
    })
  })
})
