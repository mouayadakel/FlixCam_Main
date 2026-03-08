/**
 * Unit tests for studio-package.validator
 */

import {
  createStudioPackageSchema,
  updateStudioPackageSchema,
  reorderStudioPackageSchema,
} from '../studio-package.validator'

describe('studio-package.validator', () => {
  describe('createStudioPackageSchema', () => {
    it('accepts valid input', () => {
      const result = createStudioPackageSchema.safeParse({
        name: 'Basic Package',
        price: 500,
      })
      expect(result.success).toBe(true)
    })
    it('accepts with all optional fields', () => {
      const result = createStudioPackageSchema.safeParse({
        name: 'Premium',
        nameAr: 'بريميوم',
        nameZh: '高级',
        description: 'Full day',
        descriptionAr: 'يوم كامل',
        descriptionZh: '全天',
        includes: 'Lights, camera',
        price: 1000,
        originalPrice: 1200,
        discountPercent: 20,
        hours: 8,
        recommended: true,
        badgeText: 'Popular',
        order: 1,
        isActive: true,
      })
      expect(result.success).toBe(true)
    })
    it('rejects empty name', () => {
      const result = createStudioPackageSchema.safeParse({
        name: '',
        price: 100,
      })
      expect(result.success).toBe(false)
    })
    it('rejects negative price', () => {
      const result = createStudioPackageSchema.safeParse({
        name: 'Package',
        price: -1,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateStudioPackageSchema', () => {
    it('accepts partial update', () => {
      const result = updateStudioPackageSchema.safeParse({
        price: 600,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('reorderStudioPackageSchema', () => {
    it('accepts empty array', () => {
      const result = reorderStudioPackageSchema.safeParse({ packageIds: [] })
      expect(result.success).toBe(true)
    })
    it('accepts array of cuids', () => {
      const result = reorderStudioPackageSchema.safeParse({
        packageIds: ['clxxxxxxxxxxxxxxxxxxxxxxxxxx'],
      })
      expect(result.success).toBe(true)
    })
  })
})
