/**
 * Unit tests for quote.validator
 */
import {
  quoteStatusSchema,
  createQuoteSchema,
  updateQuoteSchema,
  convertQuoteSchema,
  quoteFilterSchema,
} from '../quote.validator'

describe('quote.validator', () => {
  const validCreate = {
    customerId: 'cust-1',
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-03-05'),
    equipment: [{ equipmentId: 'eq-1', quantity: 2 }],
  }

  describe('quoteStatusSchema', () => {
    it('accepts valid status', () => {
      expect(quoteStatusSchema.safeParse('draft').success).toBe(true)
      expect(quoteStatusSchema.safeParse('sent').success).toBe(true)
    })
    it('rejects invalid status', () => {
      expect(quoteStatusSchema.safeParse('invalid').success).toBe(false)
    })
  })

  describe('createQuoteSchema', () => {
    it('accepts valid input', () => {
      const result = createQuoteSchema.safeParse(validCreate)
      expect(result.success).toBe(true)
    })
    it('rejects when endDate before startDate', () => {
      const result = createQuoteSchema.safeParse({
        ...validCreate,
        startDate: new Date('2026-03-10'),
        endDate: new Date('2026-03-05'),
      })
      expect(result.success).toBe(false)
    })
    it('rejects when equipment empty', () => {
      const result = createQuoteSchema.safeParse({
        ...validCreate,
        equipment: [],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateQuoteSchema', () => {
    it('accepts partial input', () => {
      expect(updateQuoteSchema.safeParse({ notes: 'Updated' }).success).toBe(true)
    })
  })

  describe('convertQuoteSchema', () => {
    it('accepts quoteId', () => {
      expect(convertQuoteSchema.safeParse({ quoteId: 'q1' }).success).toBe(true)
    })
    it('rejects empty quoteId', () => {
      expect(convertQuoteSchema.safeParse({ quoteId: '' }).success).toBe(false)
    })
  })

  describe('quoteFilterSchema', () => {
    it('accepts valid filter', () => {
      expect(quoteFilterSchema.safeParse({ status: 'draft', customerId: 'c1' }).success).toBe(true)
      expect(quoteFilterSchema.safeParse({ dateFrom: '2026-01-01', dateTo: '2026-12-31' }).success).toBe(true)
    })
  })
})
