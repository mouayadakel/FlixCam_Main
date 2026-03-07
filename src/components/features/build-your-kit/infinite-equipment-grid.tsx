/**
 * Infinite scroll equipment grid. Loads pages via useEquipmentInfinite; sentinel triggers fetchNextPage.
 */

'use client'

import { useEffect, useRef } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { useKitWizardStore } from '@/lib/stores/kit-wizard.store'
import { useEquipmentInfinite, type EquipmentListItem } from '@/lib/hooks/use-kit-queries'
import {
  KitEquipmentCard,
  type KitEquipmentItem,
} from '@/components/features/build-your-kit/kit-equipment-card'
import { EquipmentSkeleton } from '@/components/features/build-your-kit/kit-skeleton'
import { Button } from '@/components/ui/button'

function toKitItem(e: EquipmentListItem): KitEquipmentItem {
  return {
    id: e.id,
    sku: e.sku,
    model: e.model,
    dailyPrice: e.dailyPrice,
    weeklyPrice: e.weeklyPrice ?? undefined,
    monthlyPrice: e.monthlyPrice ?? undefined,
    quantityAvailable: e.quantityAvailable,
    category: e.category ? { name: e.category.name, slug: e.category.slug } : null,
    brand: e.brand ? { name: e.brand.name, slug: e.brand.slug } : null,
    media: e.media?.map((m) => ({ url: m.url, type: m.type })) ?? [],
  }
}

interface InfiniteEquipmentGridProps {
  categoryId: string | null
  budgetTier: string | null
  searchQuery?: string
  sortBy?: string
  /** Equipment IDs from shoot-type recommendations; cards with matching id show "AI Pick" badge */
  recommendedIds?: string[]
}

export function InfiniteEquipmentGrid({
  categoryId,
  budgetTier,
  searchQuery = '',
  sortBy = 'recommended',
  recommendedIds = [],
}: InfiniteEquipmentGridProps) {
  const { t } = useLocale()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const addEquipment = useKitWizardStore((s) => s.addEquipment)
  const removeEquipment = useKitWizardStore((s) => s.removeEquipment)
  const setQty = useKitWizardStore((s) => s.setQty)
  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)
  const durationDays = useKitWizardStore((s) => s.durationDays)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useEquipmentInfinite({
    categoryId,
    budgetTier: budgetTier as 'ESSENTIAL' | 'PROFESSIONAL' | 'PREMIUM' | null,
    q: searchQuery || undefined,
    sort: sortBy,
  })

  const equipment = data?.pages.flatMap((p) => p.data) ?? []

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage || isFetchingNextPage) return
    const el = sentinelRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage()
      },
      { rootMargin: '400px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) {
    return <EquipmentSkeleton count={8} />
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-border-light bg-surface-light p-8 text-center">
        <p className="mb-4 text-destructive">{error?.message ?? t('kit.errorLoading')}</p>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  if (equipment.length === 0) {
    return (
      <div className="rounded-xl border border-border-light bg-surface-light p-8 text-center text-text-muted">
        {t('kit.noEquipment')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {equipment.map((e) => {
          const item = toKitItem(e)
          const selectedQty = selectedEquipment[e.id]?.qty ?? 0
          return (
            <KitEquipmentCard
              key={e.id}
              item={item}
              selectedQty={selectedQty}
              onToggle={() => {
                if (selectedQty > 0) removeEquipment(e.id)
                else
                  addEquipment(e.id, 1, e.dailyPrice, {
                    model: e.model ?? undefined,
                    imageUrl: e.media[0]?.url,
                    categoryId: e.categoryId,
                  })
              }}
              onQtyChange={(qty) => {
                if (qty < 1) removeEquipment(e.id)
                else setQty(e.id, qty)
              }}
              multiSelectMode
              aiRecommended={recommendedIds.includes(e.id)}
              durationDays={durationDays}
            />
          )
        })}
      </div>

      <div ref={sentinelRef} className="h-4" aria-hidden />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <EquipmentSkeleton count={6} />
        </div>
      )}

      {!hasNextPage && equipment.length > 0 && (
        <p className="py-6 text-center text-sm text-text-muted">—</p>
      )}
    </div>
  )
}
