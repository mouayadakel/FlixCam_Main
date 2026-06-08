'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { gtagPageView } from '@/lib/analytics/gtag'

interface RouteChangeTrackerProps {
  ga4Id: string
  /** When GTM loads GA4, skip direct gtag page views */
  skipWhenGtm: boolean
}

export function RouteChangeTracker({ ga4Id, skipWhenGtm }: RouteChangeTrackerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!ga4Id || skipWhenGtm) return
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    if (typeof window !== 'undefined') {
      ;(window as unknown as { __GA_ID__?: string }).__GA_ID__ = ga4Id
    }
    gtagPageView(url, ga4Id)
  }, [pathname, searchParams, ga4Id, skipWhenGtm])

  return null
}
