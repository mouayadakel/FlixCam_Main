/**
 * Unit tests for i18n content-helper (getLocalizedField, getLocalizedName, getLocalizedDescription)
 */

import {
  getLocalizedField,
  getLocalizedName,
  getLocalizedDescription,
} from '../content-helper'

describe('content-helper', () => {
  describe('getLocalizedField', () => {
    it('returns empty string for null item', () => {
      expect(getLocalizedField(null, 'name', 'en')).toBe('')
    })

    it('returns empty string for undefined item', () => {
      expect(getLocalizedField(undefined, 'name', 'en')).toBe('')
    })

    it('returns base field for ar locale', () => {
      const item = { name: 'الاسم', nameEn: 'Name En' }
      expect(getLocalizedField(item, 'name', 'ar')).toBe('الاسم')
    })

    it('returns locale-specific field when available', () => {
      const item = { name: 'الاسم', nameEn: 'Name En' }
      expect(getLocalizedField(item, 'name', 'en')).toBe('Name En')
    })

    it('falls back to base field when locale-specific missing', () => {
      const item = { name: 'الاسم' }
      expect(getLocalizedField(item, 'name', 'en')).toBe('الاسم')
    })

    it('returns empty string when both missing', () => {
      const item = {}
      expect(getLocalizedField(item, 'name', 'en')).toBe('')
    })
  })

  describe('getLocalizedName', () => {
    it('returns localized name for equipment', () => {
      const item = { name: 'كاميرا', nameEn: 'Camera', nameZh: '相机' }
      expect(getLocalizedName(item, 'en')).toBe('Camera')
      expect(getLocalizedName(item, 'ar')).toBe('كاميرا')
      expect(getLocalizedName(item, 'zh')).toBe('相机')
    })

    it('returns empty string for null', () => {
      expect(getLocalizedName(null, 'en')).toBe('')
    })
  })

  describe('getLocalizedDescription', () => {
    it('returns localized description', () => {
      const item = {
        description: 'وصف',
        descriptionEn: 'Description En',
        descriptionZh: '描述',
      }
      expect(getLocalizedDescription(item, 'en')).toBe('Description En')
      expect(getLocalizedDescription(item, 'ar')).toBe('وصف')
    })

    it('returns empty string for null', () => {
      expect(getLocalizedDescription(null, 'en')).toBe('')
    })
  })
})
