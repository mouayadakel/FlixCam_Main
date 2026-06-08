/**
 * @file format.utils.ts
 * @description Formatting utilities — delegates to i18n/formatting (FIX-026/027)
 * @module lib/utils
 */

import type { Locale } from '@/lib/i18n/locales'
import {
  formatCurrency as formatCurrencyI18n,
  formatDate as formatDateI18n,
  formatDateTime as formatDateTimeI18n,
  formatShortDate,
} from '@/lib/i18n/formatting'

const DEFAULT_LOCALE: Locale = 'ar'

function toLocale(code?: string): Locale {
  if (!code) return DEFAULT_LOCALE
  if (code === 'en' || code.startsWith('en-')) return 'en'
  if (code === 'zh' || code.startsWith('zh-')) return 'zh'
  if (code === 'fr' || code.startsWith('fr-')) return 'fr'
  if (code === 'ar' || code.startsWith('ar-')) return 'ar'
  return DEFAULT_LOCALE
}

export function formatCurrency(amount: number, currency: string = 'SAR'): string {
  void currency
  return formatCurrencyI18n(amount, DEFAULT_LOCALE)
}

export function formatSar(amount: number, locale: string = 'ar-SA'): string {
  return formatCurrencyI18n(amount, toLocale(locale))
}

export function formatDate(
  date: string | Date,
  format: 'short' | 'long' = 'short',
  locale: Locale = DEFAULT_LOCALE
): string {
  if (format === 'long') {
    return formatDateI18n(date, locale)
  }
  return formatShortDate(date, locale)
}

export function formatDateTime(date: string | Date, locale: Locale = DEFAULT_LOCALE): string {
  return formatDateTimeI18n(date, locale)
}

export function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    risk_check: 'bg-yellow-100 text-yellow-800',
    payment_pending: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    active: 'bg-purple-100 text-purple-800',
    returned: 'bg-orange-100 text-orange-800',
    closed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
  }

  return statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
}
