/**
 * Dynamic per-category equipment step. Recommended items first (with badge + reason), then "More in category".
 * Skip category option when not required.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { useKitWizardStore, getCurrentCategoryStep, getKitWizardTotalDaily, type BudgetTier } from '@/lib/stores/kit-wizard.store'
import { KitEquipmentCard, type KitEquipmentItem } from '@/components/features/build-your-kit/kit-equipment-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, Zap, Star, Crown } from 'lucide-react'

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

interface RecItem {
  equipmentId: string
  budgetTier: string
  reason: string | null
  reasonAr: string | null
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

export function StepCategoryEquipment() {
  const { t } = useLocale()
  const categorySteps = useKitWizardStore((s) => s.categorySteps)
  const currentCategoryIndex = useKitWizardStore((s) => s.currentCategoryIndex)
  const shootTypeData = useKitWizardStore((s) => s.shootTypeData)
  const budgetTier = useKitWizardStore((s) => s.budgetTier)
  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)
  const addEquipment = useKitWizardStore((s) => s.addEquipment)
  const removeEquipment = useKitWizardStore((s) => s.removeEquipment)
  const setQty = useKitWizardStore((s) => s.setQty)
  const setBudgetTier = useKitWizardStore((s) => s.setBudgetTier)
  const skipCategory = useKitWizardStore((s) => s.skipCategory)

  const currentStep = getCurrentCategoryStep({ categorySteps, currentCategoryIndex })
  const [otherEquipment, setOtherEquipment] = useState<KitEquipmentItem[]>([])
  const [lensCompatibilityMap, setLensCompatibilityMap] = useState<Record<string, string[]>>({})
  const [loadingOther, setLoadingOther] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const isLensesStep = currentStep?.categorySlug === 'lenses'
  const selectedIds = Object.keys(selectedEquipment)

  const recommendations = (shootTypeData?.recommendations ?? []) as RecItem[]
  const recsForCategory = currentStep
    ? recommendations.filter(
        (r) => r.equipment.categoryId === currentStep.categoryId && (!budgetTier || r.budgetTier === budgetTier)
      )
  : []
  const recommendedIds = new Set(recsForCategory.map((r) => r.equipment.id))

  const loadOtherEquipment = useCallback(() => {
    if (!currentStep) return
    setLoadingOther(true)
    const params = new URLSearchParams({
      categoryId: currentStep.categoryId,
      take: '50',
      sort: 'price_asc',
      ...(budgetTier && { budgetTier }),
    })
    if (isLensesStep && selectedIds.length > 0) {
      fetch('/api/public/kit-compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedEquipmentIds: selectedIds,
          targetCategoryId: currentStep.categoryId,
        }),
      })
        .then((res) => res.json())
        .then((json) => {
          const data = Array.isArray(json?.data) ? json.data : []
          const map: Record<string, string[]> = {}
          setOtherEquipment(
            data
              .filter((e: { id: string }) => !recommendedIds.has(e.id))
              .map((e: { id: string; model?: string; sku: string; dailyPrice: number; category?: { name: string; slug: string }; brand?: { name: string; slug: string }; media?: { url: string; type: string }[]; matchingCameraModels?: string[] }) => {
                if (e.matchingCameraModels?.length) map[e.id] = e.matchingCameraModels
                return {
                  id: e.id,
                  model: e.model ?? null,
                  sku: e.sku,
                  dailyPrice: typeof e.dailyPrice === 'number' ? e.dailyPrice : Number(e.dailyPrice),
                  category: e.category ?? null,
                  brand: e.brand ?? null,
                  media: e.media ?? [],
                }
              })
          )
          setLensCompatibilityMap(map)
        })
        .catch(() => {
          setOtherEquipment([])
          setLensCompatibilityMap({})
        })
        .finally(() => setLoadingOther(false))
    } else {
      setLensCompatibilityMap({})
      fetch(`/api/public/equipment?${params}`)
        .then((res) => res.json())
        .then((json) => {
          const data = Array.isArray(json?.data) ? json.data : []
          setOtherEquipment(
            data
              .filter((e: { id: string }) => !recommendedIds.has(e.id))
              .map((e: { id: string; model?: string; sku: string; dailyPrice: number; category?: { name: string; slug: string }; brand?: { name: string; slug: string }; media?: { url: string; type: string }[] }) => ({
                id: e.id,
                model: e.model ?? null,
                sku: e.sku,
                dailyPrice: typeof e.dailyPrice === 'number' ? e.dailyPrice : Number(e.dailyPrice),
                category: e.category ?? null,
                brand: e.brand ?? null,
                media: e.media ?? [],
              }))
          )
        })
        .catch(() => setOtherEquipment([]))
        .finally(() => setLoadingOther(false))
    }
  }, [currentStep?.categoryId, currentStep?.categorySlug, budgetTier, isLensesStep, selectedIds.length])

  useEffect(() => {
    if (!currentStep) return
    loadOtherEquipment()
  }, [currentStep?.categoryId, loadOtherEquipment])

  useEffect(() => {
    recsForCategory.forEach((r) => {
      if (r.isAutoSelect && !selectedEquipment[r.equipmentId]) {
        const dailyPrice = Number(r.equipment.dailyPrice)
        addEquipment(
          r.equipmentId,
          r.defaultQuantity,
          dailyPrice,
          {
            model: r.equipment.model ?? r.equipment.sku,
            imageUrl: r.equipment.media[0]?.url,
            categoryId: r.equipment.categoryId,
            isRecommended: true,
            budgetTier: r.budgetTier as 'ESSENTIAL' | 'PROFESSIONAL' | 'PREMIUM',
          }
        )
      }
    })
  }, [currentStep?.categoryId])

  const totalDaily = getKitWizardTotalDaily({ selectedEquipment })
  const selectedCount = Object.values(selectedEquipment).reduce((sum, { qty }) => sum + qty, 0)

  if (!currentStep) {
    return (
      <div className="text-text-muted">
        {t('kit.chooseCategoryDesc')}
      </div>
    )
  }

  const stepTitle = currentStep.stepTitle || currentStep.categoryName
  const stepDesc = currentStep.stepDescription

  const handleToggle = (item: KitEquipmentItem | RecItem['equipment'], isRec: boolean) => {
    const id = item.id
    const dailyPrice = 'dailyPrice' in item && typeof item.dailyPrice === 'number' ? item.dailyPrice : Number((item as RecItem['equipment']).dailyPrice)
    const model = item.model ?? (item as RecItem['equipment']).sku
    const media = (item as KitEquipmentItem).media ?? (item as RecItem['equipment']).media ?? []
    const current = selectedEquipment[id]
    if (current) {
      removeEquipment(id)
    } else {
      addEquipment(id, 1, dailyPrice, {
        model: model ?? undefined,
        imageUrl: media[0]?.url,
        categoryId: currentStep.categoryId,
        isRecommended: isRec,
      })
    }
  }

  const handleQtyChange = (item: { id: string }, qty: number) => {
    if (qty < 1) removeEquipment(item.id)
    else setQty(item.id, qty)
  }

  const toCardItem = (e: RecItem['equipment']): KitEquipmentItem => ({
    id: e.id,
    sku: e.sku,
    model: e.model,
    dailyPrice: Number(e.dailyPrice),
    category: e.category ? { name: e.category.name, slug: e.category.slug } : null,
    brand: e.brand,
    media: e.media,
  })

  const tierPills: { id: BudgetTier; labelKey: string; Icon: typeof Zap }[] = [
    { id: 'ESSENTIAL', labelKey: 'kit.budgetEssential', Icon: Zap },
    { id: 'PROFESSIONAL', labelKey: 'kit.budgetProfessional', Icon: Star },
    { id: 'PREMIUM', labelKey: 'kit.budgetPremium', Icon: Crown },
  ]

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-section-title text-text-heading mb-1">
            {stepTitle}
          </h2>
          {stepDesc && (
            <p className="text-body-main text-text-muted">{stepDesc}</p>
          )}
        </div>
        <div className="flex gap-1 rounded-lg border border-border-light bg-surface-light p-1">
          {tierPills.map(({ id, labelKey, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setBudgetTier(id)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                budgetTier === id
                  ? 'bg-brand-primary text-white'
                  : 'text-text-muted hover:bg-white hover:text-text-heading'
              )}
            >
              <Icon className="h-4 w-4" />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>
      {currentStep.minRecommended != null && (
        <p className="text-sm text-text-muted mb-6">
          {t('kit.minRecommended').replace('{min}', String(currentStep.minRecommended))}
        </p>
      )}

      {/* Recommended */}
      {recsForCategory.length > 0 && (
        <div className="mb-8">
          <h3 className="text-card-title text-text-heading mb-3 flex items-center gap-2">
            <span className="rounded bg-brand-primary/10 px-2 py-0.5 text-sm font-medium text-brand-primary">
              {t('kit.recommendedFor')}
            </span>
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {recsForCategory.map((r) => {
              const item = toCardItem(r.equipment)
              const selectedQty = selectedEquipment[r.equipmentId]?.qty ?? 0
              return (
                <div key={r.equipmentId} className="relative">
                  <KitEquipmentCard
                    item={item}
                    selectedQty={selectedQty}
                    onToggle={() => handleToggle(r.equipment, true)}
                    onQtyChange={(qty) => handleQtyChange(r.equipment, qty)}
                  />
                  {r.reason && (
                    <p className="mt-1 text-xs text-text-muted">{r.reason}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* More in category */}
      <div>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-border-light/60 bg-surface-light/50 px-4 py-3 text-left font-medium text-text-heading"
          onClick={() => setShowMore(!showMore)}
        >
          <span>
            {isLensesStep && selectedIds.length > 0
              ? t('kit.compatibleWithSelection')
              : `${t('kit.moreInCategory')} — ${currentStep.categoryName}`}
          </span>
          {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showMore && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {loadingOther ? (
              <div className="col-span-2 py-8 text-center text-text-muted">Loading...</div>
            ) : (
              otherEquipment.map((item) => {
                const selectedQty = selectedEquipment[item.id]?.qty ?? 0
                const cameraModels = lensCompatibilityMap[item.id]
                const compatibleLabel =
                  isLensesStep && selectedIds.length > 0 && cameraModels?.length
                    ? t('kit.compatibleWith').replace('{model}', cameraModels[0])
                    : isLensesStep && selectedIds.length > 0
                      ? t('kit.requiresAdapter')
                      : null
                return (
                  <div key={item.id} className="relative">
                    <KitEquipmentCard
                      item={item}
                      selectedQty={selectedQty}
                      onToggle={() => handleToggle(item, false)}
                      onQtyChange={(qty) => handleQtyChange(item, qty)}
                    />
                    {compatibleLabel && (
                      <span className={cn('mt-1 inline-block text-xs', cameraModels?.length ? 'text-brand-primary' : 'text-text-muted')}>
                        {compatibleLabel}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {!currentStep.isRequired && (
        <div className="mt-6">
          <Button
            type="button"
            variant="ghost"
            className="text-text-muted"
            onClick={() => skipCategory(currentStep.categoryId)}
          >
            {t('kit.skipCategory')}
          </Button>
        </div>
      )}

      {selectedCount > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-light bg-surface-light px-4 py-3">
          <span className="text-sm font-medium text-text-heading">
            {t('kit.itemsSelected').replace('{count}', String(selectedCount))} — {formatSar(totalDaily)} / {t('kit.perDay')}
          </span>
        </div>
      )}
    </div>
  )
}
