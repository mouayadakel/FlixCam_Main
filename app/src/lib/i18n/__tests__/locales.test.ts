/**
 * Unit tests for i18n locales (pure functions)
 */

import {
  LOCALES,
  DEFAULT_LOCALE,
  RTL_LOCALES,
  LOCALE_LABELS,
  getDir,
  isRtl,
  parseLocale,
} from '../locales'

describe('locales', () => {
  describe('constants', () => {
    it('LOCALES includes ar, en, zh, fr', () => {
      expect(LOCALES).toContain('ar')
      expect(LOCALES).toContain('en')
      expect(LOCALES).toContain('zh')
      expect(LOCALES).toContain('fr')
      expect(LOCALES).toHaveLength(4)
    })

    it('DEFAULT_LOCALE is ar', () => {
      expect(DEFAULT_LOCALE).toBe('ar')
    })

    it('RTL_LOCALES contains only ar', () => {
      expect(RTL_LOCALES).toEqual(['ar'])
    })

    it('LOCALE_LABELS has all locales', () => {
      expect(LOCALE_LABELS.ar).toBe('العربية')
      expect(LOCALE_LABELS.en).toBe('English')
      expect(LOCALE_LABELS.zh).toBe('中文')
      expect(LOCALE_LABELS.fr).toBe('Français')
    })
  })

  describe('getDir', () => {
    it('returns rtl for ar', () => {
      expect(getDir('ar')).toBe('rtl')
    })

    it('returns ltr for en, zh, fr', () => {
      expect(getDir('en')).toBe('ltr')
      expect(getDir('zh')).toBe('ltr')
      expect(getDir('fr')).toBe('ltr')
    })
  })

  describe('isRtl', () => {
    it('returns true for ar', () => {
      expect(isRtl('ar')).toBe(true)
    })

    it('returns false for en, zh, fr', () => {
      expect(isRtl('en')).toBe(false)
      expect(isRtl('zh')).toBe(false)
      expect(isRtl('fr')).toBe(false)
    })
  })

  describe('parseLocale', () => {
    it('returns valid locale when given valid string', () => {
      expect(parseLocale('ar')).toBe('ar')
      expect(parseLocale('en')).toBe('en')
      expect(parseLocale('zh')).toBe('zh')
      expect(parseLocale('fr')).toBe('fr')
    })

    it('returns DEFAULT_LOCALE for null', () => {
      expect(parseLocale(null)).toBe('ar')
    })

    it('returns DEFAULT_LOCALE for undefined', () => {
      expect(parseLocale(undefined)).toBe('ar')
    })

    it('returns DEFAULT_LOCALE for empty string', () => {
      expect(parseLocale('')).toBe('ar')
    })

    it('returns DEFAULT_LOCALE for invalid locale', () => {
      expect(parseLocale('de')).toBe('ar')
      expect(parseLocale('invalid')).toBe('ar')
    })
  })
})
