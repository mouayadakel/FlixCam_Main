'use client'

/**
 * Phase 10a — PDPL / analytics cookie consent banner.
 */

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'flixcam_cookie_consent'

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: true, ts: Date.now() }))
    setVisible(false)
    window.dispatchEvent(new CustomEvent('flixcam:cookie-consent', { detail: { analytics: true } }))
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: false, ts: Date.now() }))
    setVisible(false)
    window.dispatchEvent(new CustomEvent('flixcam:cookie-consent', { detail: { analytics: false } }))
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] border-t bg-background/95 p-4 shadow-lg backdrop-blur md:bottom-4 md:left-4 md:right-auto md:max-w-md md:rounded-lg md:border"
      role="dialog"
      aria-label="Cookie consent"
    >
      <p className="mb-3 text-sm text-muted-foreground">
        نستخدم ملفات تعريف الارتباط للتحليلات وتحسين التجربة. / We use cookies for analytics and
        to improve your experience.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={accept}>
          Accept
        </Button>
        <Button size="sm" variant="outline" onClick={decline}>
          Essential only
        </Button>
      </div>
    </div>
  )
}
