/**
 * Price lock notice (Phase 3.4). Shows TTL or static message.
 */

'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Lock } from 'lucide-react'

const LOCK_TTL_SECONDS = 15 * 60 // 15 minutes

interface PriceLockNoticeProps {
  lockedAt: Date | null
  onExpired?: () => void
  className?: string
}

function getSecondsRemaining(lockedAt: Date): number {
  const elapsed = (Date.now() - lockedAt.getTime()) / 1000
  return Math.max(0, Math.floor(LOCK_TTL_SECONDS - elapsed))
}

export function PriceLockNotice({ lockedAt, onExpired, className = '' }: PriceLockNoticeProps) {
  const { t } = useLocale()
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    lockedAt ? getSecondsRemaining(lockedAt) : null
  )

  useEffect(() => {
    if (!lockedAt) return
    const tick = () => {
      const s = getSecondsRemaining(lockedAt)
      setSecondsLeft(s)
      if (s <= 0 && onExpired) onExpired()
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lockedAt, onExpired])

  if (!lockedAt) return null

  if (secondsLeft !== null && secondsLeft <= 0) {
    return (
      <div
        className={`flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400 ${className}`}
        role="alert"
      >
        <Lock className="h-4 w-4 shrink-0" />
        <span>{t('checkout.priceLockExpired')}</span>
      </div>
    )
  }

  const mins = secondsLeft != null ? Math.floor(secondsLeft / 60) : 15
  const secs = secondsLeft != null ? secondsLeft % 60 : 0
  const timeText = secondsLeft != null ? `${mins}:${secs.toString().padStart(2, '0')}` : '15:00'

  return (
    <div
      className={`flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-300 ${className}`}
    >
      <Lock className="h-4 w-4 shrink-0" />
      <span>
        {t('checkout.priceLockNotice')}
        {secondsLeft != null && (
          <span className="ms-1 font-mono" dir="ltr">
            ({timeText})
          </span>
        )}
      </span>
    </div>
  )
}
