/**
 * ═══════════════════════════════════════════════════════
 * FILE: src/lib/utils/whatsapp-context.ts
 * FEATURE: WhatsApp deep links
 * UNITS: getWhatsAppUrl
 * ═══════════════════════════════════════════════════════
 *
 * REQUIREMENTS:
 *   - Returns https://wa.me/{number} with number optional; strips non-digits.
 *   - Optional message appended as encoded text= query param; message trimmed.
 */

import { getWhatsAppUrl } from '../whatsapp-context'

describe('whatsapp-context', () => {
  describe('getWhatsAppUrl', () => {
    it('returns base wa.me URL when no options', () => {
      const url = getWhatsAppUrl({})
      expect(url).toMatch(/^https:\/\/wa\.me\/\d+$/)
    })

    it('includes number when provided', () => {
      const url = getWhatsAppUrl({ number: '966501234567' })
      expect(url).toBe('https://wa.me/966501234567')
    })

    it('strips non-digits from number', () => {
      const url = getWhatsAppUrl({ number: '+966 50 123 4567' })
      expect(url).toBe('https://wa.me/966501234567')
    })

    it('appends encoded text when message provided', () => {
      const url = getWhatsAppUrl({ message: 'مرحبا' })
      expect(url).toContain('wa.me/')
      expect(url).toContain('text=')
      expect(decodeURIComponent(url.split('text=')[1]!)).toBe('مرحبا')
    })

    it('combines number and message', () => {
      const url = getWhatsAppUrl({ number: '966500000000', message: 'Test' })
      expect(url).toContain('wa.me/966500000000')
      expect(url).toContain('text=Test')
    })

    it('trims message', () => {
      const url = getWhatsAppUrl({ message: '  hi  ' })
      expect(decodeURIComponent(url.split('text=')[1]!)).toBe('hi')
    })
  })
})
