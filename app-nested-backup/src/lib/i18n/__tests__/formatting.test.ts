/**
 * Unit tests for i18n formatting (pure functions)
 */

import {
  formatDate,
  formatTime,
  formatDateTime,
  formatShortDate,
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatRelativeTime,
  formatFileSize,
} from '../formatting'

describe('formatting', () => {
  const testDate = new Date('2026-03-15T14:30:00Z')

  describe('formatDate', () => {
    it('formats date for en locale', () => {
      const result = formatDate(testDate, 'en')
      expect(result).toMatch(/March|15|2026/)
    })

    it('accepts string date', () => {
      const result = formatDate('2026-03-15', 'en')
      expect(result).toMatch(/March|15|2026/)
    })
  })

  describe('formatTime', () => {
    it('formats time for en locale', () => {
      const result = formatTime(testDate, 'en')
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  describe('formatDateTime', () => {
    it('formats date and time for en locale', () => {
      const result = formatDateTime(testDate, 'en')
      expect(result).toMatch(/March|15|2026/)
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  describe('formatShortDate', () => {
    it('formats short date', () => {
      const result = formatShortDate(testDate, 'en')
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })
  })

  describe('formatCurrency', () => {
    it('formats SAR amount', () => {
      const result = formatCurrency(1234.56, 'en')
      expect(result).toContain('1,234.56')
      expect(result).toMatch(/SAR|ر\.س|﷼/)
    })

    it('handles zero', () => {
      const result = formatCurrency(0, 'en')
      expect(result).toBeDefined()
    })
  })

  describe('formatNumber', () => {
    it('formats number with locale', () => {
      const result = formatNumber(1234567.89, 'en')
      expect(result).toMatch(/1,234,567|1\.234\.567/)
    })
  })

  describe('formatPercentage', () => {
    it('formats percentage (input 0-100)', () => {
      const result = formatPercentage(75, 'en')
      expect(result).toMatch(/75|٪|%/)
    })

    it('accepts decimals parameter', () => {
      const result = formatPercentage(33.33, 'en', 2)
      expect(result).toBeDefined()
    })
  })

  describe('formatRelativeTime', () => {
    it('formats relative time', () => {
      const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      const result = formatRelativeTime(past, 'en')
      expect(result).toMatch(/day|ago|2/)
    })
  })

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(500, 'en')).toMatch(/500.*B/)
    })

    it('formats KB', () => {
      const result = formatFileSize(2048, 'en')
      expect(result).toMatch(/KB/)
    })

    it('formats MB', () => {
      const result = formatFileSize(1024 * 1024, 'en')
      expect(result).toMatch(/MB/)
    })
  })
})
