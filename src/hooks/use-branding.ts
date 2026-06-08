'use client'

import { useState, useEffect } from 'react'

interface BrandingData {
  logoUrl: string
  siteName: string
  siteNameAr: string
}

const CACHE_KEY = 'flixcam_branding_v1'

export function useBranding() {
  const [data, setData] = useState<BrandingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Try to load from localStorage first for "instant" feel
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        setData(JSON.parse(cached))
        setLoading(false)
      } catch (e) {
        // ignore
      }
    }

    let cancelled = false
    fetch('/api/public/branding')
      .then(res => res.json())
      .then(json => {
        if (cancelled) return
        setData(json)
        localStorage.setItem(CACHE_KEY, JSON.stringify(json))
      })
      .catch(() => {
        // stay with null or cached
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  return { 
    logoUrl: data?.logoUrl || null,
    siteName: data?.siteName || 'FlixCam',
    siteNameAr: data?.siteNameAr || 'فليكس كام',
    loading 
  }
}
