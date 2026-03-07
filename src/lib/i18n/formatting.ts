/**
 * Locale-aware formatting utilities for dates, times, currency, and numbers
 * Sprint 5: Accessibility & UX Enhancements
 */

import type { Locale } from './locales'

/**
 * Get locale code for Intl APIs
 */
function getIntlLocale(locale: Locale): string {
  const localeMap: Record<Locale, string> = {
    ar: 'ar-SA',
    en: 'en-US',
    zh: 'zh-CN',
    fr: 'fr-FR',
  }
  return localeMap[locale] || 'ar-SA'
}

/**
 * Format date according to locale
 */
export function formatDate(date: Date | string, locale: Locale): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const intlLocale = getIntlLocale(locale)

  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj)
}

/**
 * Format time according to locale
 */
export function formatTime(time: Date | string, locale: Locale): string {
  const timeObj = typeof time === 'string' ? new Date(time) : time
  const intlLocale = getIntlLocale(locale)

  return new Intl.DateTimeFormat(intlLocale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timeObj)
}

/**
 * Format date and time according to locale
 */
export function formatDateTime(dateTime: Date | string, locale: Locale): string {
  const dateTimeObj = typeof dateTime === 'string' ? new Date(dateTime) : dateTime
  const intlLocale = getIntlLocale(locale)

  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateTimeObj)
}

/**
 * Format short date (e.g., "21/02/2026" or "02/21/2026")
 */
export function formatShortDate(date: Date | string, locale: Locale): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const intlLocale = getIntlLocale(locale)

  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj)
}

/**
 * Format currency (SAR) according to locale
 */
export function formatCurrency(amount: number, locale: Locale): string {
  const intlLocale = getIntlLocale(locale)

  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format number according to locale
 */
export function formatNumber(num: number, locale: Locale): string {
  const intlLocale = getIntlLocale(locale)

  return new Intl.NumberFormat(intlLocale).format(num)
}

/**
 * Format percentage according to locale
 */
export function formatPercentage(num: number, locale: Locale, decimals: number = 0): string {
  const intlLocale = getIntlLocale(locale)

  return new Intl.NumberFormat(intlLocale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num / 100)
}

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(date: Date | string, locale: Locale): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const intlLocale = getIntlLocale(locale)
  const now = new Date()
  const diffMs = dateObj.getTime() - now.getTime()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)

  const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: 'auto' })

  if (Math.abs(diffDay) >= 1) {
    return rtf.format(diffDay, 'day')
  } else if (Math.abs(diffHour) >= 1) {
    return rtf.format(diffHour, 'hour')
  } else if (Math.abs(diffMin) >= 1) {
    return rtf.format(diffMin, 'minute')
  } else {
    return rtf.format(diffSec, 'second')
  }
}

/**
 * Format file size according to locale
 */
export function formatFileSize(bytes: number, locale: Locale): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${formatNumber(Math.round(size * 100) / 100, locale)} ${units[unitIndex]}`
}
