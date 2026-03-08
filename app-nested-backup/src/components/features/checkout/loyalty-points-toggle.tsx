/**
 * Loyalty Points Redemption Toggle – shown in checkout.
 * Fetches user's available points, shows real-time discount preview.
 */

'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Gift } from 'lucide-react'

interface LoyaltyPointsToggleProps {
  onApply?: (pointsUsed: number, discount: number) => void
}

const POINTS_TO_SAR_RATIO = 100 // 100 points = 1 SAR

export function LoyaltyPointsToggle({ onApply }: LoyaltyPointsToggleProps) {
  const { t } = useLocale()
  const [availablePoints, setAvailablePoints] = useState<number | null>(null)
  const [usePoints, setUsePoints] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me/loyalty-points')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { points?: number } | null) => {
        setAvailablePoints(data?.points ?? 0)
      })
      .catch(() => setAvailablePoints(0))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (availablePoints && usePoints) {
      const discount = Math.floor(availablePoints / POINTS_TO_SAR_RATIO)
      onApply?.(availablePoints, discount)
    } else {
      onApply?.(0, 0)
    }
  }, [usePoints, availablePoints, onApply])

  if (loading || !availablePoints || availablePoints <= 0) return null

  const discountAmount = Math.floor(availablePoints / POINTS_TO_SAR_RATIO)

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={usePoints}
          onChange={(e) => setUsePoints(e.target.checked)}
          className="h-4 w-4 rounded border-amber-300 text-amber-600 accent-amber-600 focus:ring-amber-500/20"
        />
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
            <Gift className="h-4 w-4" />
            {t('checkout.useLoyaltyPoints')}
          </div>
          <p className="mt-0.5 text-xs text-amber-700/70">
            {availablePoints.toLocaleString()} {t('checkout.pointsAvailable')}
            {' · '}
            {t('checkout.pointsWorth').replace('{amount}', discountAmount.toLocaleString())}
          </p>
        </div>
        {usePoints && (
          <span className="rounded-lg bg-amber-200/60 px-2.5 py-1 text-sm font-bold text-amber-800">
            -{discountAmount} SAR
          </span>
        )}
      </label>
    </div>
  )
}
