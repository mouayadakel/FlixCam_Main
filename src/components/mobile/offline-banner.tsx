'use client'

import { useState, useEffect } from 'react'

/**
 * Shows a dismissible banner when the app is offline.
 * Renders nothing when online.
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => {
      setIsOnline(false)
      setDismissed(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 top-0 z-[100] bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950"
    >
      <span>لا يوجد اتصال بالإنترنت. سيتم المزامنة عند العودة.</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="ms-3 rounded underline focus:outline-none focus:ring-2 focus:ring-amber-900"
        aria-label="إغلاق"
      >
        إغلاق
      </button>
    </div>
  )
}
