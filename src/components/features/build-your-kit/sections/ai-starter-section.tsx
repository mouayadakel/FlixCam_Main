/**
 * AI-powered starter kit: pre-selected essentials from shoot type recommendations.
 * User can toggle items; appears after setup is complete.
 */

'use client'

import { useEffect } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { useToast } from '@/hooks/use-toast'
import { useKitWizardStore } from '@/lib/stores/kit-wizard.store'
import { useShootTypeConfig } from '@/lib/hooks/use-kit-queries'
import { KitEquipmentCard, type KitEquipmentItem } from '@/components/features/build-your-kit/kit-equipment-card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface RecItem {
  equipmentId: string
  budgetTier: string
  reason: string | null
  defaultQuantity: number
  isAutoSelect: boolean
  equipment: {
    id: string
    sku: string
    model: string | null
    dailyPrice: { toNumber?: () => number }
    categoryId: string
    category: { name: string; slug: string }
    brand: { name: string; slug: string } | null
    media: { url: string; type: string }[]
  }
}

export function AIStarterSection() {
  const { t } = useLocale()
  const { toast } = useToast()
  const shootTypeSlug = useKitWizardStore((s) => s.shootTypeSlug)
  const budgetTier = useKitWizardStore((s) => s.budgetTier)
  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)
  const addEquipment = useKitWizardStore((s) => s.addEquipment)
  const removeEquipment = useKitWizardStore((s) => s.removeEquipment)
  const setQty = useKitWizardStore((s) => s.setQty)

  const { data: config, isLoading, error } = useShootTypeConfig(shootTypeSlug)
  const recommendations = (config?.recommendations ?? []) as RecItem[]
  const recsFiltered = budgetTier
    ? recommendations.filter((r) => r.budgetTier === budgetTier)
    : recommendations

  useEffect(() => {
    if (error && shootTypeSlug) {
      toast({
        title: t('kit.suggestionsUnavailable'),
        variant: 'destructive',
      })
    }
  }, [error, shootTypeSlug, toast, t])

  const toCardItem = (e: RecItem['equipment']): KitEquipmentItem => ({
    id: e.id,
    sku: e.sku,
    model: e.model,
    dailyPrice: typeof e.dailyPrice === 'number' ? e.dailyPrice : Number(e.dailyPrice),
    category: e.category ? { name: e.category.name, slug: e.category.slug } : null,
    brand: e.brand,
    media: e.media ?? [],
  })

  if (isLoading) {
    return (
      <section className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </section>
    )
  }

  if (error || recsFiltered.length === 0) {
    return null
  }

  const recommendationIds = new Set(recsFiltered.map((r) => r.equipmentId))
  const selectedFromRecs = recsFiltered.filter((r) => (selectedEquipment[r.equipmentId]?.qty ?? 0) > 0)
  const hasPriorSelections = Object.keys(selectedEquipment).length > 0

  const handleAcceptAll = () => {
    recsFiltered.forEach((r) => {
      const current = selectedEquipment[r.equipmentId]?.qty ?? 0
      if (current < 1) {
        addEquipment(
          r.equipmentId,
          r.defaultQuantity,
          Number(r.equipment.dailyPrice),
          {
            model: r.equipment.model ?? undefined,
            imageUrl: r.equipment.media[0]?.url,
            categoryId: r.equipment.categoryId,
            isRecommended: true,
            budgetTier: r.budgetTier as 'ESSENTIAL' | 'PROFESSIONAL' | 'PREMIUM',
          }
        )
      }
    })
  }

  const handleClearAll = () => {
    recommendationIds.forEach((id) => removeEquipment(id))
  }

  const handleStartFresh = () => {
    Object.keys(selectedEquipment).forEach((id) => removeEquipment(id))
  }

  return (
    <section id="ai-starter" className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-heading">
          <span className="rounded bg-brand-primary/10 px-2 py-0.5 text-sm font-medium text-brand-primary">
            {t('kit.recommendedFor')}
          </span>
          {' '}{config?.name ?? t('kit.stepEquipment')}
        </h2>
        <div className="flex items-center gap-2">
          {hasPriorSelections && (
            <Button type="button" variant="outline" size="sm" onClick={handleStartFresh}>
              {t('kit.startFresh')}
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={handleClearAll} disabled={selectedFromRecs.length === 0}>
            {t('kit.clearAll')}
          </Button>
          <Button type="button" size="sm" onClick={handleAcceptAll} disabled={selectedFromRecs.length === recsFiltered.length}>
            {t('kit.acceptAll')}
          </Button>
        </div>
      </div>
      {hasPriorSelections && selectedFromRecs.length === 0 && (
        <p className="text-sm text-text-muted">
          {t('kit.yourPreviousSelections')}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {recsFiltered.map((r) => {
          const item = toCardItem(r.equipment)
          const selectedQty = selectedEquipment[r.equipmentId]?.qty ?? 0
          return (
            <div key={r.equipmentId} className="relative">
              <KitEquipmentCard
                item={item}
                selectedQty={selectedQty}
                onToggle={() => {
                  if (selectedQty > 0) removeEquipment(r.equipmentId)
                  else
                    addEquipment(
                      r.equipmentId,
                      r.defaultQuantity,
                      Number(r.equipment.dailyPrice),
                      {
                        model: r.equipment.model ?? undefined,
                        imageUrl: r.equipment.media[0]?.url,
                        categoryId: r.equipment.categoryId,
                        isRecommended: true,
                        budgetTier: r.budgetTier as 'ESSENTIAL' | 'PROFESSIONAL' | 'PREMIUM',
                      }
                    )
                }}
                onQtyChange={(qty) => {
                  if (qty < 1) removeEquipment(r.equipmentId)
                  else setQty(r.equipmentId, qty)
                }}
                multiSelectMode
                aiRecommended
              />
              {r.reason && (
                <p className="mt-1 text-xs text-text-muted">{r.reason}</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
