/**
 * @file analytics.ts
 * @description GA4 + Web Vitals (Phase 0.5). Report Core Web Vitals and optional GA4 events.
 * @module lib
 */

export const GA4_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || process.env.GA4_MEASUREMENT_ID || ''

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

/**
 * Track a custom studio event via GA4 (or console in dev).
 */
export function trackStudioEvent(
  eventName: 'package_selected' | 'addon_toggled' | 'booking_started' | 'compare_opened',
  params: Record<string, string | number | boolean | null>
): void {
  if (typeof window === 'undefined') return
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  if (gtag && GA4_MEASUREMENT_ID) {
    gtag('event', eventName, {
      event_category: 'Studio Booking',
      ...params,
    })
  }
  if (process.env.NODE_ENV === 'development') {
     
    console.debug('[studio-analytics]', eventName, params)
  }
}

/**
 * Track blog events via GA4.
 */
export function trackBlogEvent(
  eventName: 'blog_view' | 'blog_share' | 'blog_reaction' | 'blog_newsletter_signup',
  params: Record<string, string | number | boolean | null>
): void {
  if (typeof window === 'undefined') return
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  if (gtag && GA4_MEASUREMENT_ID) {
    gtag('event', eventName, {
      event_category: 'Blog',
      ...params,
    })
  }
  if (process.env.NODE_ENV === 'development') {
     
    console.debug('[blog-analytics]', eventName, params)
  }
}
