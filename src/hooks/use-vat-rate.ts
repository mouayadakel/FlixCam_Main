'use client'

import { useEffect, useState } from 'react'

const FALLBACK = 0.15

export interface UseVatRateResult {
  /** Decimal rate e.g. 0.15 */
  vatRate: number
  percentLabel: string
  isReady: boolean
}

/**
 * Loads configured VAT from `/api/public/vat-rate` (falls back to 15% until loaded).
 */
export function useVatRate(): UseVatRateResult {
  const [vatRate, setVatRate] = useState(FALLBACK)
  const [percentLabel, setPercentLabel] = useState('15.00%')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/public/vat-rate')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { rate?: number; percentLabel?: string } | null) => {
        if (cancelled || !data || typeof data.rate !== 'number') {
          if (!cancelled) setIsReady(true)
          return
        }
        setVatRate(data.rate)
        if (typeof data.percentLabel === 'string') setPercentLabel(data.percentLabel)
        setIsReady(true)
      })
      .catch(() => {
        if (!cancelled) setIsReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { vatRate, percentLabel, isReady }
}
