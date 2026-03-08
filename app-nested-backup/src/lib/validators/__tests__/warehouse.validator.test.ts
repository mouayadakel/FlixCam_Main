/**
 * Unit tests for warehouse.validator
 */

import {
  checkOutSchema,
  checkInSchema,
  inventoryFilterSchema,
  inspectionChecklistItemSchema,
} from '../warehouse.validator'

describe('warehouse.validator', () => {
  describe('inspectionChecklistItemSchema', () => {
    it('accepts valid item', () => {
      const result = inspectionChecklistItemSchema.safeParse({
        item: 'Lens',
        status: 'ok',
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid status', () => {
      const result = inspectionChecklistItemSchema.safeParse({
        item: 'Lens',
        status: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('checkOutSchema', () => {
    it('accepts valid input', () => {
      const result = checkOutSchema.safeParse({
        bookingId: 'bk_1',
        equipmentIds: ['eq_1'],
        checklist: [{ item: 'Lens', status: 'ok' }],
      })
      expect(result.success).toBe(true)
    })
    it('rejects when equipmentIds empty', () => {
      const result = checkOutSchema.safeParse({
        bookingId: 'bk_1',
        equipmentIds: [],
        checklist: [{ item: 'Lens', status: 'ok' }],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('checkInSchema', () => {
    it('accepts valid input', () => {
      const result = checkInSchema.safeParse({
        bookingId: 'bk_1',
        equipmentIds: ['eq_1'],
        checklist: [{ item: 'Lens', status: 'ok' }],
      })
      expect(result.success).toBe(true)
    })
    it('accepts with condition', () => {
      const result = checkInSchema.safeParse({
        bookingId: 'bk_1',
        equipmentIds: ['eq_1'],
        checklist: [{ item: 'Lens', status: 'ok' }],
        condition: 'EXCELLENT',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('inventoryFilterSchema', () => {
    it('accepts valid filter', () => {
      const result = inventoryFilterSchema.safeParse({
        warehouseLocation: 'A1',
        available: true,
      })
      expect(result.success).toBe(true)
    })
  })
})
