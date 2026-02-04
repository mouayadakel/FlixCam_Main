/**
 * @file analytics.ts
 * @description GA4 + Web Vitals (Phase 0.5). Report Core Web Vitals and optional GA4 events.
 * @module lib
 */

export const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || process.env.GA4_MEASUREMENT_ID || ''

export interface WebVitalsMetric {
  id: string
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB'
  value: number
  delta: number
  rating: 'good' | 'needs-improvement' | 'poor'
  navigationType?: string
}

/**
 * Send Web Vitals to GA4 (when measurement ID is set).
 */
export function reportWebVitalsToGA4(metric: WebVitalsMetric): void {
  if (typeof window === 'undefined' || !GA4_MEASUREMENT_ID) return
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  if (gtag) {
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    })
  }
}
