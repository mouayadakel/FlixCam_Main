/**
 * Unit tests for equipment.validator
 */

import {
  createEquipmentSchema,
  updateEquipmentSchema,
  equipmentTranslationSchema,
  equipmentConditionSchema,
} from '../equipment.validator'

describe('equipment.validator', () => {
  describe('equipmentConditionSchema', () => {
    it('accepts valid conditions', () => {
      expect(equipmentConditionSchema.safeParse('EXCELLENT').success).toBe(true)
      expect(equipmentConditionSchema.safeParse('MAINTENANCE').success).toBe(true)
    })
    it('rejects invalid condition', () => {
      expect(equipmentConditionSchema.safeParse('INVALID').success).toBe(false)
    })
  })

  describe('equipmentTranslationSchema', () => {
    it('accepts valid translation', () => {
      const result = equipmentTranslationSchema.safeParse({
        locale: 'en',
        name: 'Sony FX6',
      })
      expect(result.success).toBe(true)
    })
    it('rejects when name missing', () => {
      const result = equipmentTranslationSchema.safeParse({ locale: 'en' })
      expect(result.success).toBe(false)
    })
  })

  describe('createEquipmentSchema', () => {
    it('accepts valid input with translations', () => {
      const result = createEquipmentSchema.safeParse({
        model: 'Sony FX6',
        categoryId: 'cat_1',
        dailyPrice: 100,
        translations: [{ locale: 'en', name: 'Sony FX6' }],
      })
      expect(result.success).toBe(true)
    })
    it('accepts depositAmount preprocess: empty string, null, undefined, NaN become undefined', () => {
      const base = { model: 'X', categoryId: 'c1', dailyPrice: 100, translations: [{ locale: 'en', name: 'X' }] }
      expect(createEquipmentSchema.safeParse({ ...base, depositAmount: '' }).success).toBe(true)
      expect(createEquipmentSchema.safeParse({ ...base, depositAmount: null }).success).toBe(true)
      expect(createEquipmentSchema.safeParse({ ...base, depositAmount: 500 }).success).toBe(true)
    })
    it('accepts dailyPrice preprocess: empty string, null, undefined, NaN become undefined (then required_error)', () => {
      const base = { model: 'X', categoryId: 'c1', translations: [{ locale: 'en', name: 'X' }] }
      expect(createEquipmentSchema.safeParse({ ...base, dailyPrice: '' }).success).toBe(false)
      expect(createEquipmentSchema.safeParse({ ...base, dailyPrice: null }).success).toBe(false)
      expect(createEquipmentSchema.safeParse({ ...base, dailyPrice: undefined }).success).toBe(false)
      expect(createEquipmentSchema.safeParse({ ...base, dailyPrice: Number.NaN }).success).toBe(false)
    })
    it('accepts weeklyPrice and monthlyPrice preprocess: empty string coerced to undefined', () => {
      const base = { model: 'X', categoryId: 'c1', dailyPrice: 100, translations: [{ locale: 'en', name: 'X' }] }
      expect(createEquipmentSchema.safeParse({ ...base, weeklyPrice: '' }).success).toBe(true)
      expect(createEquipmentSchema.safeParse({ ...base, monthlyPrice: '' }).success).toBe(true)
    })
    it('accepts specifications as structured object (groups, highlights, quickSpecs)', () => {
      const base = { model: 'X', categoryId: 'c1', dailyPrice: 100, translations: [{ locale: 'en', name: 'X' }] }
      expect(
        createEquipmentSchema.safeParse({
          ...base,
          specifications: { groups: [], highlights: [], quickSpecs: [] },
        }).success
      ).toBe(true)
    })
    it('accepts featuredImageUrl and videoUrl as empty string', () => {
      const base = { model: 'X', categoryId: 'c1', dailyPrice: 100, translations: [{ locale: 'en', name: 'X' }] }
      expect(createEquipmentSchema.safeParse({ ...base, featuredImageUrl: '' }).success).toBe(true)
      expect(createEquipmentSchema.safeParse({ ...base, videoUrl: '' }).success).toBe(true)
    })
    it('rejects when translations missing', () => {
      const result = createEquipmentSchema.safeParse({
        model: 'Sony FX6',
        categoryId: 'cat_1',
        dailyPrice: 100,
      })
      expect(result.success).toBe(false)
    })
    it('rejects when model empty', () => {
      const result = createEquipmentSchema.safeParse({
        model: '',
        categoryId: 'cat_1',
        dailyPrice: 100,
        translations: [{ locale: 'en', name: 'X' }],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateEquipmentSchema', () => {
    it('accepts partial with id', () => {
      const result = updateEquipmentSchema.safeParse({ id: 'eq_1', model: 'Updated' })
      expect(result.success).toBe(true)
    })
    it('rejects when id missing', () => {
      const result = updateEquipmentSchema.safeParse({ model: 'Updated' })
      expect(result.success).toBe(false)
    })
  })
})
