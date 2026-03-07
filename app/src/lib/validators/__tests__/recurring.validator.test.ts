/**
 * Unit tests for recurring.validator
 */

import {
  createRecurringSeriesSchema,
  updateRecurringSeriesSchema,
} from '../recurring.validator'

const validCuid = 'clxxxxxxxxxxxxxxxxxxxxxxxxxx'

describe('recurring.validator', () => {
  describe('createRecurringSeriesSchema', () => {
    it('accepts valid input with endDate', () => {
      const result = createRecurringSeriesSchema.safeParse({
        name: 'Weekly Rental',
        customerId: validCuid,
        frequency: 'WEEKLY',
        interval: 1,
        endDate: '2026-12-31T23:59:59Z',
        template: {
          equipmentIds: [{ equipmentId: validCuid, quantity: 1 }],
        },
      })
      expect(result.success).toBe(true)
    })
    it('accepts valid input with occurrenceCount', () => {
      const result = createRecurringSeriesSchema.safeParse({
        name: 'Monthly',
        customerId: validCuid,
        frequency: 'MONTHLY',
        interval: 2,
        occurrenceCount: 6,
        template: {
          equipmentIds: [{ equipmentId: validCuid, quantity: 2 }],
          studioId: validCuid,
          notes: 'Notes',
        },
      })
      expect(result.success).toBe(true)
    })
    it('rejects when neither endDate nor occurrenceCount provided', () => {
      const result = createRecurringSeriesSchema.safeParse({
        name: 'Test',
        customerId: validCuid,
        frequency: 'DAILY',
        template: {
          equipmentIds: [{ equipmentId: validCuid, quantity: 1 }],
        },
      })
      expect(result.success).toBe(false)
    })
    it('rejects invalid frequency', () => {
      const result = createRecurringSeriesSchema.safeParse({
        name: 'Test',
        customerId: validCuid,
        frequency: 'INVALID',
        endDate: '2026-12-31T00:00:00Z',
        template: {
          equipmentIds: [{ equipmentId: validCuid, quantity: 1 }],
        },
      })
      expect(result.success).toBe(false)
    })
    it('rejects empty equipmentIds', () => {
      const result = createRecurringSeriesSchema.safeParse({
        name: 'Test',
        customerId: validCuid,
        frequency: 'WEEKLY',
        endDate: '2026-12-31T00:00:00Z',
        template: {
          equipmentIds: [],
        },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateRecurringSeriesSchema', () => {
    it('accepts partial update', () => {
      const result = updateRecurringSeriesSchema.safeParse({
        name: 'Updated',
        isActive: false,
      })
      expect(result.success).toBe(true)
    })
    it('accepts empty object', () => {
      const result = updateRecurringSeriesSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })
})
