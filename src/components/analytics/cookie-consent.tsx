'use client'

/**
 * Phase 0.6: Cookie consent banner (PDPL/GDPR). Stores preference in localStorage.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const CONSENT_KEY = 'flixcam_cookie_consent'

export function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false)
  const [accepted, setAccepted] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY)
      setAccepted(stored === 'accepted' || stored === 'declined')
    } catch {
      setAccepted(false)
    }
    setMounted(true)
  }, [])

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted')
    } catch {
      // ignore
    }
    setAccepted(true)
  }

  const handleDecline = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'declined')
    } catch {
      // ignore
    }
    setAccepted(true)
  }

  if (!mounted || accepted) return null

  return (
    <div
      className="fixed bottom-0 start-0 end-0 z-50 border-t bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          نستخدم ملفات تعريف الارتباط لتحسين تجربتك والتحليلات. بمواصلة التصفح فإنك توافق على{' '}
          <Link href="/privacy" className="underline hover:text-foreground">
            سياسة الخصوصية
          </Link>
          {' و'}
          <Link href="/terms" className="underline hover:text-foreground">
            الشروط والأحكام
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={handleDecline}>
            رفض
          </Button>
          <Button size="sm" onClick={handleAccept}>
            قبول
          </Button>
        </div>
      </div>
    </div>
  )
}
