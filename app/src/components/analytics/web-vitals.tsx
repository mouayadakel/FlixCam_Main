'use client'

/**
 * Phase 0.5: Report Web Vitals (and to GA4 when configured).
 */

import { useReportWebVitals } from 'next/web-vitals'
import { reportWebVitalsToGA4 } from '@/lib/analytics'

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    reportWebVitalsToGA4({
      id: metric.id,
      name: metric.name as 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB',
      value: metric.value,
      delta: metric.delta,
      rating: metric.rating as 'good' | 'needs-improvement' | 'poor',
      navigationType: metric.navigationType,
    })
  })
  return null
}
