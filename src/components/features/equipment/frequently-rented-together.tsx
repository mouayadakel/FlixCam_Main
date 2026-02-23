/**
 * Frequently Rented Together – shows 2-3 items commonly rented with the current equipment.
 * Fetches from API, renders mini cards with add-to-cart action.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { isExternalImageUrl } from '@/lib/utils/image.utils'
import { ShoppingCart, Package, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/stores/cart.store'

const PLACEHOLDER = '/images/placeholder.jpg'

interface BundleItem {
  id: string
  sku: string | null
  model: string | null
  dailyPrice: number
  quantityAvailable: number
  category: { name: string; slug: string } | null
  brand: { name: string; slug: string } | null
  media: { id: string; url: string; type: string }[]
}

interface FrequentlyRentedTogetherProps {
  equipmentId: string
}

export function FrequentlyRentedTogether({ equipmentId }: FrequentlyRentedTogetherProps) {
  const { t } = useLocale()
  const [items, setItems] = useState<BundleItem[]>([])
  const [source, setSource] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [addingAll, setAddingAll] = useState(false)
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set())
  const addItem = useCartStore((s) => s.addItem)

  const handleImgError = useCallback((id: string) => {
    setFailedIds((prev) => new Set(prev).add(id))
  }, [])

  useEffect(() => {
    if (!equipmentId) return
    setLoading(true)
    fetch(`/api/public/equipment/${equipmentId}/frequently-rented-together`)
      .then((res) => res.json())
      .then((json) => {
        setItems(Array.isArray(json?.items) ? json.items : [])
        setSource(json?.source ?? '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [equipmentId])

  if (!loading && items.length === 0) return null

  return (
    <section className="mt-10 rounded-2xl border border-border-light/60 bg-surface-light/30 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Package className="h-5 w-5 text-brand-primary" />
        <h3 className="text-lg font-semibold text-text-heading">
          {t('common.frequentlyRentedTogether')}
        </h3>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-border-light/50 bg-white"
            >
              <div className="aspect-[4/3] animate-pulse bg-border-light/40" />
              <div className="space-y-2 p-3">
                <div className="h-3 w-16 animate-pulse rounded bg-border-light/50" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-border-light/60" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {items.map((item) => {
              const imgUrl = item.media?.[0]?.url || PLACEHOLDER
              const soldOut = item.quantityAvailable <= 0
              return (
                <Link
                  key={item.id}
                  href={`/equipment/${item.id}`}
                  className="group overflow-hidden rounded-xl border border-border-light/50 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-surface-light">
                    {failedIds.has(item.id) ? (
                      <div className="absolute inset-0 bg-surface-light" />
                    ) : (
                      <Image
                        src={imgUrl}
                        alt={item.model ?? item.sku ?? item.id}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 33vw"
                        unoptimized={isExternalImageUrl(imgUrl)}
                        onError={() => handleImgError(item.id)}
                      />
                    )}
                    {soldOut && (
                      <span className="absolute end-2 top-2 rounded-md bg-sold-out/90 px-2 py-0.5 text-xs text-white">
                        {t('common.unavailable')}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-text-muted">
                      {item.brand?.name ?? item.category?.name ?? ''}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-text-heading group-hover:text-brand-primary">
                      {item.model ?? item.sku ?? item.id}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-brand-primary">
                      {item.dailyPrice > 0
                        ? `${item.dailyPrice.toLocaleString()} SAR / ${t('common.pricePerDay')}`
                        : '—'}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
              disabled={addingAll}
              onClick={async (e) => {
                e.preventDefault()
                setAddingAll(true)
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                const end = new Date(tomorrow)
                end.setDate(end.getDate() + 6)
                const startDate = tomorrow.toISOString().slice(0, 10)
                const endDate = end.toISOString().slice(0, 10)
                try {
                  for (const item of items.filter((i) => i.quantityAvailable > 0)) {
                    await addItem({
                      itemType: 'EQUIPMENT',
                      equipmentId: item.id,
                      startDate,
                      endDate,
                      quantity: 1,
                      dailyRate: item.dailyPrice,
                    })
                  }
                } catch {}
                setAddingAll(false)
              }}
            >
              {addingAll ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="me-2 h-4 w-4" />
              )}
              {t('common.addAllToCart')}
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
