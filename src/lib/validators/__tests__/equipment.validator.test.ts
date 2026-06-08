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
    it('accepts locale-only row; name optional and coerced to empty string', () => {
      const result = equipmentTranslationSchema.safeParse({ locale: 'en' })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.name).toBe('')
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
    it('accepts minimal / incomplete payloads (draft saves)', () => {
      expect(createEquipmentSchema.safeParse({}).success).toBe(true)
      expect(
        createEquipmentSchema.safeParse({
          isActive: true,
          featured: true,
          featuredImageUrl: '',
        }).success
      ).toBe(true)
    })
    it('accepts depositAmount preprocess: empty string, null, undefined, NaN become undefined', () => {
      const base = {
        model: 'X',
        categoryId: 'c1',
        dailyPrice: 100,
        translations: [{ locale: 'en', name: 'X' }],
      }
      expect(createEquipmentSchema.safeParse({ ...base, depositAmount: '' }).success).toBe(true)
      expect(createEquipmentSchema.safeParse({ ...base, depositAmount: null }).success).toBe(true)
      expect(createEquipmentSchema.safeParse({ ...base, depositAmount: 500 }).success).toBe(true)
    })
    it('accepts dailyPrice preprocess: empty string, null, undefined, NaN become optional', () => {
      const base = { model: 'X', categoryId: 'c1', translations: [{ locale: 'en', name: 'X' }] }
      expect(createEquipmentSchema.safeParse({ ...base, dailyPrice: '' }).success).toBe(true)
      expect(createEquipmentSchema.safeParse({ ...base, dailyPrice: null }).success).toBe(true)
      expect(createEquipmentSchema.safeParse({ ...base, dailyPrice: undefined }).success).toBe(true)
      expect(createEquipmentSchema.safeParse({ ...base, dailyPrice: Number.NaN }).success).toBe(true)
    })
    it('accepts weeklyPrice and monthlyPrice preprocess: empty string coerced to undefined', () => {
      const base = {
        model: 'X',
        categoryId: 'c1',
        dailyPrice: 100,
        translations: [{ locale: 'en', name: 'X' }],
      }
      expect(createEquipmentSchema.safeParse({ ...base, weeklyPrice: '' }).success).toBe(true)
      expect(createEquipmentSchema.safeParse({ ...base, monthlyPrice: '' }).success).toBe(true)
    })
    it('accepts specifications as structured object with at least one group', () => {
      const base = {
        model: 'X',
        categoryId: 'c1',
        dailyPrice: 100,
        translations: [{ locale: 'en', name: 'X' }],
      }
      expect(
        createEquipmentSchema.safeParse({
          ...base,
          specifications: {
            groups: [
              {
                label: 'General',
                icon: 'camera',
                priority: 1,
                specs: [{ key: 'k1', label: 'Label', value: 'v' }],
              },
            ],
            highlights: [],
            quickSpecs: [],
          },
        }).success
      ).toBe(true)
    })
    it('accepts structured specifications with empty groups (draft)', () => {
      const base = {
        model: 'X',
        categoryId: 'c1',
        dailyPrice: 100,
        translations: [{ locale: 'en', name: 'X' }],
      }
      expect(
        createEquipmentSchema.safeParse({
          ...base,
          specifications: { groups: [], highlights: [], quickSpecs: [] },
        }).success
      ).toBe(true)
    })
    it('rejects duplicate spec keys across groups', () => {
      const base = {
        model: 'X',
        categoryId: 'c1',
        dailyPrice: 100,
        translations: [{ locale: 'en', name: 'X' }],
      }
      expect(
        createEquipmentSchema.safeParse({
          ...base,
          specifications: {
            groups: [
              {
                label: 'A',
                icon: 'camera',
                priority: 1,
                specs: [{ key: 'dup', label: 'A', value: '1' }],
              },
              {
                label: 'B',
                icon: 'video',
                priority: 2,
                specs: [{ key: 'dup', label: 'B', value: '2' }],
              },
            ],
          },
        }).success
      ).toBe(false)
    })
    it('rejects type range without rangePercent', () => {
      const base = {
        model: 'X',
        categoryId: 'c1',
        dailyPrice: 100,
        translations: [{ locale: 'en', name: 'X' }],
      }
      expect(
        createEquipmentSchema.safeParse({
          ...base,
          specifications: {
            groups: [
              {
                label: 'G',
                icon: 'gauge',
                priority: 1,
                specs: [
                  {
                    key: 'bat',
                    label: 'Battery',
                    value: '50',
                    type: 'range',
                  },
                ],
              },
            ],
          },
        }).success
      ).toBe(false)
    })
    it('accepts featuredImageUrl and videoUrl as empty string', () => {
      const base = {
        model: 'X',
        categoryId: 'c1',
        dailyPrice: 100,
        translations: [{ locale: 'en', name: 'X' }],
      }
      expect(createEquipmentSchema.safeParse({ ...base, featuredImageUrl: '' }).success).toBe(true)
      expect(createEquipmentSchema.safeParse({ ...base, videoUrl: '' }).success).toBe(true)
    })
    it('accepts when translations missing', () => {
      const result = createEquipmentSchema.safeParse({
        model: 'Sony FX6',
        categoryId: 'cat_1',
        dailyPrice: 100,
      })
      expect(result.success).toBe(true)
    })
    it('accepts when model empty string', () => {
      const result = createEquipmentSchema.safeParse({
        model: '',
        categoryId: 'cat_1',
        dailyPrice: 100,
        translations: [{ locale: 'en', name: 'X' }],
      })
      expect(result.success).toBe(true)
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
    it('accepts quantityTotal, quantityAvailable, bufferTime when NaN (cleared number inputs)', () => {
      const result = updateEquipmentSchema.safeParse({
        id: 'eq_1',
        quantityTotal: Number.NaN,
        quantityAvailable: Number.NaN,
        bufferTime: Number.NaN,
      })
      expect(result.success).toBe(true)
    })
    it('strips empty highlight/quickSpec rows from structured specifications', () => {
      const result = updateEquipmentSchema.safeParse({
        id: 'eq_1',
        specifications: {
          groups: [
            {
              label: 'General',
              icon: 'camera',
              priority: 1,
              specs: [{ key: 'k', label: 'L', value: 'v' }],
            },
          ],
          highlights: [
            { icon: 'star', label: '', value: '' },
            { label: 'Weight', value: '2kg' },
          ],
          quickSpecs: [{ icon: '', label: '', value: '' }],
        },
      })
      expect(result.success).toBe(true)
      if (!result.success) return
      const specs = result.data.specifications as {
        highlights?: Array<{ label: string; value: string }>
        quickSpecs?: unknown[]
      }
      expect(specs?.highlights?.length).toBe(1)
      expect(specs?.highlights?.[0]?.label).toBe('Weight')
      expect(specs?.quickSpecs).toBeUndefined()
    })
  })
})
