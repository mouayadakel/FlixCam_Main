/**
 * Unit tests for locale.store
 * Runs in Node env; setLocale skips document/window when undefined.
 */

import { useLocaleStore } from '../locale.store'

jest.mock('@/lib/i18n/locales', () => ({
  DEFAULT_LOCALE: 'en',
  getDir: jest.fn((locale: string) => (locale === 'ar' ? 'rtl' : 'ltr')),
}))

jest.mock('@/lib/i18n/cookie', () => ({
  getLocaleFromCookie: jest.fn(() => null),
  setLocaleCookie: jest.fn(),
}))

jest.mock('@/lib/i18n/translate', () => ({
  preloadMessages: jest.fn(),
}))

const mockReload = jest.fn()

describe('locale.store', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockReload.mockClear()
    useLocaleStore.setState({ locale: 'en', dir: 'ltr' })
  })

  describe('initial state', () => {
    it('has default locale and dir', () => {
      const state = useLocaleStore.getState()
      expect(state.locale).toBe('en')
      expect(state.dir).toBe('ltr')
    })
  })

  describe('initFromCookie', () => {
    it('updates state when cookie has locale', () => {
      const { getLocaleFromCookie } = require('@/lib/i18n/cookie')
      ;(getLocaleFromCookie as jest.Mock).mockReturnValue('ar')

      useLocaleStore.getState().initFromCookie()

      expect(useLocaleStore.getState().locale).toBe('ar')
      expect(useLocaleStore.getState().dir).toBe('rtl')
    })

    it('keeps default when cookie is empty', () => {
      const { getLocaleFromCookie } = require('@/lib/i18n/cookie')
      ;(getLocaleFromCookie as jest.Mock).mockReturnValue(null)

      useLocaleStore.getState().initFromCookie()

      expect(useLocaleStore.getState().locale).toBe('en')
    })
  })

  describe('setLocale', () => {
    it('updates locale and dir', () => {
      const { setLocaleCookie } = require('@/lib/i18n/cookie')
      const { preloadMessages } = require('@/lib/i18n/translate')

      useLocaleStore.getState().setLocale('ar')

      expect(preloadMessages).toHaveBeenCalledWith('ar')
      expect(setLocaleCookie).toHaveBeenCalledWith('ar')
      expect(useLocaleStore.getState().locale).toBe('ar')
      expect(useLocaleStore.getState().dir).toBe('rtl')
    })

    it('sets document attributes and reloads when document exists', () => {
      const doc = {
        documentElement: { lang: '', dir: '' },
      }
      const win = { location: { reload: mockReload } }
      Object.defineProperty(global, 'document', { value: doc, writable: true })
      Object.defineProperty(global, 'window', { value: win, writable: true })

      useLocaleStore.getState().setLocale('zh')

      expect(doc.documentElement.lang).toBe('zh')
      expect(doc.documentElement.dir).toBe('ltr')
      expect(mockReload).toHaveBeenCalled()

      Object.defineProperty(global, 'document', { value: undefined, writable: true })
      Object.defineProperty(global, 'window', { value: undefined, writable: true })
    })
  })

  describe('initFromCookie with document', () => {
    it('sets document attributes when cookie has locale and document exists', () => {
      const { getLocaleFromCookie } = require('@/lib/i18n/cookie')
      ;(getLocaleFromCookie as jest.Mock).mockReturnValue('ar')

      const doc = { documentElement: { lang: '', dir: '' } }
      Object.defineProperty(global, 'document', { value: doc, writable: true })

      useLocaleStore.getState().initFromCookie()

      expect(doc.documentElement.lang).toBe('ar')
      expect(doc.documentElement.dir).toBe('rtl')

      Object.defineProperty(global, 'document', { value: undefined, writable: true })
    })
  })
})
