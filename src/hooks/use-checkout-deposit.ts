'use client'

import { useEffect, useState } from 'react'

/** Fetches refundable deposit amount for the current session cart. */
export function useCheckoutDeposit(enabled = true): {
  depositAmount: number
  loading: boolean
} {
  const [depositAmount, setDepositAmount] = useState(0)
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch('/api/checkout/deposit')
      .then((res) => (res.ok ? res.json() : { depositAmount: 0 }))
      .then((data: { depositAmount?: number }) => {
        if (!cancelled) {
          setDepositAmount(Number(data.depositAmount ?? 0))
        }
      })
      .catch(() => {
        if (!cancelled) setDepositAmount(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  return { depositAmount, loading }
}
