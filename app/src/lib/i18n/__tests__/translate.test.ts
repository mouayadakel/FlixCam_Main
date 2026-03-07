/**
 * Unit tests for i18n translate (t function, getMessages)
 * Uses real message files from src/messages/
 */

import { t, getMessages, getMessagesAsync, preloadMessages } from '../translate'

describe('translate', () => {
  describe('t', () => {
    it('returns translation for nested key when messages loaded', () => {
      const result = t('en', 'nav.equipment')
      expect(result).toBe('Equipment')
    })

    it('returns key when translation missing', () => {
      const result = t('en', 'nonexistent.key.path')
      expect(result).toBe('nonexistent.key.path')
    })
  })

  describe('getMessages', () => {
    it('returns messages object for locale', () => {
      const messages = getMessages('en')
      expect(messages).toBeDefined()
      expect(typeof messages).toBe('object')
      expect((messages as Record<string, unknown>).nav).toBeDefined()
    })
  })

  describe('getMessagesAsync', () => {
    it('resolves to messages for locale', async () => {
      const messages = await getMessagesAsync('en')
      expect(messages).toBeDefined()
      expect(typeof messages).toBe('object')
    })
  })

  describe('preloadMessages', () => {
    it('does not throw', () => {
      expect(() => preloadMessages('en')).not.toThrow()
    })
  })
})
