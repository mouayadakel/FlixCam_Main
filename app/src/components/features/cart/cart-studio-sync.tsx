/**
 * Reads ?studio=&date=&start=&duration=&package=&addOn= from URL and adds studio to cart.
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { useCartStore } from '@/lib/stores/cart.store'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function CartStudioSync() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useLocale()
  const synced = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const runSync = useCallback(async () => {
    const studio = searchParams?.get('studio')
    const date = searchParams?.get('date')
    const start = searchParams?.get('start')
    const duration = searchParams?.get('duration')
    if (!studio || !date || !start || !duration) return

    const durationNum = parseInt(duration, 10)
    if (Number.isNaN(durationNum) || durationNum < 1) return

    if (synced.current) return
    synced.current = true
    setError(null)
    setIsSyncing(true)

    const packageId = searchParams?.get('package') ?? undefined
    const addOnParam = searchParams?.getAll('addOn') ?? []

    try {
      const r = await fetch('/api/cart/add-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studio,
          date,
          start,
          duration: durationNum,
          package: packageId || undefined,
          addOn: addOnParam.length ? addOnParam : undefined,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        throw new Error(j.error || 'Failed')
      }
      useCartStore.setState({
        id: j.id,
        userId: j.userId,
        couponCode: j.couponCode,
        discountAmount: j.discountAmount ?? 0,
        subtotal: j.subtotal ?? 0,
        total: j.total ?? 0,
        items: j.items ?? [],
      })
      router.replace('/cart', { scroll: false })
    } catch (e) {
      synced.current = false
      setError(e instanceof Error ? e.message : t('studios.addToCartFailed'))
    } finally {
      setIsSyncing(false)
    }
  }, [searchParams, router, t])

  useEffect(() => {
    runSync()
  }, [runSync])

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTitle>{t('common.error')}</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center gap-2">
          <span>{error}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null)
              runSync()
            }}
            disabled={isSyncing}
          >
            {t('common.retry')}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
