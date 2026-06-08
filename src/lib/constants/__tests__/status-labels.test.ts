/**
 * Unit tests for status label helpers
 */

import {
  BOOKING_STATUS_LABELS,
  getStatusLabel,
  getStatusVariant,
} from '@/lib/constants/status-labels'

describe('status-labels', () => {
  it('returns Arabic label by default', () => {
    expect(getStatusLabel(BOOKING_STATUS_LABELS, 'CONFIRMED')).toBe('مؤكد')
  })

  it('returns English label when locale is en', () => {
    expect(getStatusLabel(BOOKING_STATUS_LABELS, 'CONFIRMED', 'en')).toBe('Confirmed')
  })

  it('falls back to raw value when unknown', () => {
    expect(getStatusLabel(BOOKING_STATUS_LABELS, 'UNKNOWN')).toBe('UNKNOWN')
  })

  it('returns badge variant for known status', () => {
    expect(getStatusVariant(BOOKING_STATUS_LABELS, 'CANCELLED')).toBe('destructive')
  })

  it('includes all booking lifecycle statuses', () => {
    expect(BOOKING_STATUS_LABELS.RISK_CHECK?.labelEn).toBe('Risk check')
    expect(BOOKING_STATUS_LABELS.RETURNED?.labelAr).toBe('مرتجع')
  })
})
