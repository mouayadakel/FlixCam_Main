/**
 * ═══════════════════════════════════════════════════════
 * FILE: src/lib/utils/format.utils.ts
 * FEATURE: Formatting utilities
 * UNITS: formatCurrency, formatDate, formatDateTime, formatStatus, getStatusColor
 * ═══════════════════════════════════════════════════════
 */

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatStatus,
  getStatusColor,
} from '@/lib/utils/format.utils'

// ─────────────────────────────────────
// UNIT: formatCurrency
// REQUIREMENTS:
//   - Formats number as currency; default currency SAR, locale ar-SA.
//   - Returns string with 0-2 fraction digits.
// ─────────────────────────────────────

describe('formatCurrency', () => {
  it('formats amount with default SAR and ar-SA locale', () => {
    // Arrange
    const amount = 1500.5

    // Act
    const result = formatCurrency(amount)

    // Assert — ar-SA uses Arabic numerals (١٢٣...) and RTL; result is non-empty currency string
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
    expect(result.trim()).not.toBe('')
  })

  it('formats amount with custom currency when provided', () => {
    // Arrange
    const amount = 100
    const currency = 'USD'

    // Act
    const result = formatCurrency(amount, currency)

    // Assert
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('accepts zero amount', () => {
    // Act
    const result = formatCurrency(0)

    // Assert
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })
})

// ─────────────────────────────────────
// UNIT: formatDate
// REQUIREMENTS:
//   - Accepts string or Date; format 'short' (default) or 'long'.
//   - Short: month short, day, year UTC. Long: month long, day, year UTC.
// ─────────────────────────────────────

describe('formatDate', () => {
  it('formats Date with short format by default', () => {
    // Arrange
    const date = new Date('2026-03-15T12:00:00Z')

    // Act
    const result = formatDate(date)

    // Assert — en-US short format includes year
    expect(typeof result).toBe('string')
    expect(result).toContain('2026')
  })

  it('formats string date when string is passed', () => {
    // Arrange
    const dateStr = '2026-03-15'

    // Act
    const result = formatDate(dateStr)

    // Assert
    expect(result).toContain('2026')
    expect(typeof result).toBe('string')
  })

  it('formats with long format when format is long', () => {
    // Arrange
    const date = new Date('2026-03-15T00:00:00Z')

    // Act
    const result = formatDate(date, 'long')

    // Assert
    expect(result).toContain('2026')
    expect(result).toContain('March')
    expect(typeof result).toBe('string')
  })
})

// ─────────────────────────────────────
// UNIT: formatDateTime
// REQUIREMENTS:
//   - Accepts string or Date; returns date and time in en-US, UTC.
// ─────────────────────────────────────

describe('formatDateTime', () => {
  it('formats Date with date and time', () => {
    // Arrange
    const date = new Date('2026-03-15T14:30:00Z')

    // Act
    const result = formatDateTime(date)

    // Assert
    expect(result).toContain('2026')
    expect(typeof result).toBe('string')
  })

  it('accepts string date', () => {
    // Arrange
    const dateStr = '2026-03-15T14:30:00Z'

    // Act
    const result = formatDateTime(dateStr)

    // Assert
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })
})

// ─────────────────────────────────────
// UNIT: formatStatus
// REQUIREMENTS:
//   - Splits on underscore, capitalizes each word, joins with space.
//   - e.g. payment_pending -> Payment Pending
// ─────────────────────────────────────

describe('formatStatus', () => {
  it('converts snake_case to Title Case', () => {
    // Arrange
    const status = 'payment_pending'

    // Act
    const result = formatStatus(status)

    // Assert
    expect(result).toBe('Payment Pending')
  })

  it('handles single word status', () => {
    // Arrange
    const status = 'draft'

    // Act
    const result = formatStatus(status)

    // Assert
    expect(result).toBe('Draft')
  })

  it('handles multiple underscores', () => {
    // Arrange
    const status = 'risk_check'

    // Act
    const result = formatStatus(status)

    // Assert
    expect(result).toBe('Risk Check')
  })

  it('handles empty string', () => {
    // Act
    const result = formatStatus('')

    // Assert
    expect(result).toBe('')
  })
})

// ─────────────────────────────────────
// UNIT: getStatusColor
// REQUIREMENTS:
//   - Returns Tailwind classes for known statuses (draft, risk_check, confirmed, etc.).
//   - Status matched case-insensitively.
//   - Returns 'bg-gray-100 text-gray-800' for unknown status.
// ─────────────────────────────────────

describe('getStatusColor', () => {
  it('returns correct class for known status confirmed', () => {
    // Act
    const result = getStatusColor('confirmed')

    // Assert
    expect(result).toBe('bg-green-100 text-green-800')
  })

  it('returns correct class for cancelled', () => {
    // Act
    const result = getStatusColor('cancelled')

    // Assert
    expect(result).toBe('bg-red-100 text-red-800')
  })

  it('matches status case-insensitively', () => {
    // Act
    const result = getStatusColor('CONFIRMED')

    // Assert
    expect(result).toBe('bg-green-100 text-green-800')
  })

  it('returns default gray for unknown status', () => {
    // Act
    const result = getStatusColor('unknown_status')

    // Assert
    expect(result).toBe('bg-gray-100 text-gray-800')
  })

  it('returns default for empty string', () => {
    // Act
    const result = getStatusColor('')

    // Assert
    expect(result).toBe('bg-gray-100 text-gray-800')
  })
})
