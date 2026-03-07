/**
 * Unit tests for checkout-form.validator
 */
import {
  createSectionSchema,
  updateSectionSchema,
  createFieldSchema,
  updateFieldSchema,
} from '../checkout-form.validator'

describe('checkout-form.validator', () => {
  describe('createSectionSchema', () => {
    it('accepts valid section', () => {
      const result = createSectionSchema.safeParse({
        nameEn: 'Details',
        nameAr: 'التفاصيل',
        step: 1,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sortOrder).toBe(0)
        expect(result.data.isActive).toBe(true)
      }
    })
    it('rejects when nameEn missing', () => {
      expect(createSectionSchema.safeParse({ nameAr: 'ع', step: 1, nameEn: '' }).success).toBe(false)
    })
  })

  describe('createFieldSchema', () => {
    it('accepts valid field', () => {
      const result = createFieldSchema.safeParse({
        sectionId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        fieldKey: 'receiver_name',
        labelEn: 'Name',
        labelAr: 'الاسم',
        fieldType: 'text',
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid fieldKey', () => {
      expect(
        createFieldSchema.safeParse({
          sectionId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
          fieldKey: 'Invalid-Key',
          labelEn: 'A',
          labelAr: 'أ',
          fieldType: 'text',
        }).success
      ).toBe(false)
    })
  })

  describe('updateSectionSchema', () => {
    it('accepts partial', () => {
      expect(updateSectionSchema.safeParse({ nameEn: 'Updated' }).success).toBe(true)
    })
  })

  describe('updateFieldSchema', () => {
    it('accepts partial', () => {
      expect(updateFieldSchema.safeParse({ labelEn: 'Updated' }).success).toBe(true)
    })
  })
})
