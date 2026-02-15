/**
 * Sticky sidebar: completeness score, missing essentials, selected items,
 * pricing, free-delivery threshold, and CTA.
 */

'use client'

import { useEffect, useRef } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { useToast } from '@/hooks/use-toast'
import {
  useKitWizardStore,
  getKitWizardTotalDaily,
  getKitWizardTotalAmount,
  getKitWizardSelectedCount,
  getMissingCategories,
} from '@/lib/stores/kit-wizard.store'
import { CircularProgress } from '@/components/ui/circular-progress'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const VAT_RATE = 0.15
const FREE_DELIVERY_THRESHOLD_SAR = 2000

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function completenessPercent(categorySteps: { categoryId: string }[], selectedEquipment: Record<string, { categoryId?: string | null }>): number {
  if (categorySteps.length === 0) return 0
  const selectedIds = new Set(
    Object.values(selectedEquipment)
      .map((i) => i.categoryId)
      .filter(Boolean)
  )
  const filled = categorySteps.filter((s) => selectedIds.has(s.categoryId)).length
  return Math.round((filled / categorySteps.length) * 100)
}

export function KitSummarySidebar({ className }: { className?: string }) {
  const { t } = useLocale()
  const { toast } = useToast()
  const prevCompletenessRef = useRef<number>(0)
  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)
  const durationDays = useKitWizardStore((s) => s.durationDays)
  const shootTypeData = useKitWizardStore((s) => s.shootTypeData)
  const categorySteps = useKitWizardStore((s) => s.categorySteps)
  const setActiveCategory = useKitWizardStore((s) => s.setActiveCategory)
  const setView = useKitWizardStore((s) => s.setView)
  const removeEquipment = useKitWizardStore((s) => s.removeEquipment)

  const itemCount = getKitWizardSelectedCount({ selectedEquipment })
  const totalUnits = Object.values(selectedEquipment).reduce((sum, { qty }) => sum + qty, 0)
  const totalDaily = getKitWizardTotalDaily({ selectedEquipment })
  const subtotal = getKitWizardTotalAmount({ selectedEquipment, durationDays })
  const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100
  const total = subtotal + vatAmount
  const dailyAverage = durationDays > 0 ? total / durationDays : 0

  const completeness = completenessPercent(categorySteps, selectedEquipment)
  const missingCategories = getMissingCategories({ categorySteps, selectedEquipment })

  useEffect(() => {
    if (categorySteps.length > 0 && completeness === 100 && prevCompletenessRef.current < 100) {
      toast({
        title: t('kit.completenessCelebration'),
      })
    }
    prevCompletenessRef.current = completeness
  }, [completeness, categorySteps.length, toast, t])
  const freeDeliveryProgress = Math.min(100, (total / FREE_DELIVERY_THRESHOLD_SAR) * 100)
  const gapToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD_SAR - total)

  const categoryIdToName = new Map(
    categorySteps.map((s) => [s.categoryId, s.stepTitle || s.categoryName])
  )

  const scrollToReview = () => {
    setView('review')
    document.getElementById('review')?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToEquipmentAndCategory = (categoryId: string) => {
    setView('building')
    setActiveCategory(categoryId)
    document.getElementById('equipment-browse')?.scrollIntoView({ behavior: 'smooth' })
  }

  if (itemCount === 0) {
    return (
      <div
        className={cn(
          'sticky top-24 rounded-xl border border-border-light bg-surface-light p-5 shadow-sm',
          className
        )}
      >
        <h3 className="mb-2 text-lg font-semibold text-text-heading">
          {shootTypeData?.name ? `${shootTypeData.name} – ${t('kit.summaryTitle')}` : t('kit.summaryTitle')}
        </h3>
        <p className="text-sm text-text-muted">{t('kit.emptyKit')}</p>
      </div>
    )
  }

  const completenessColor =
    completeness >= 90 ? 'stroke-green-500' : completeness >= 60 ? 'stroke-amber-500' : 'stroke-orange-500'

  return (
    <div
      className={cn(
        'sticky top-24 flex flex-col rounded-xl border border-border-light bg-surface-light p-5 shadow-sm',
        className
      )}
    >
      <h3 className="mb-4 text-lg font-semibold text-text-heading">
        {shootTypeData?.name ? `${shootTypeData.name} – ${t('kit.summaryTitle')}` : t('kit.summaryTitle')}
      </h3>

      {/* A: Completeness score */}
      {categorySteps.length > 0 && (
        <div className="mb-4 flex flex-col items-center">
          <CircularProgress
            value={completeness}
            size={100}
            strokeWidth={8}
            indicatorClassName={completenessColor}
            className="mb-2"
          >
            <span className="text-lg font-bold text-text-heading">{completeness}%</span>
          </CircularProgress>
          <p className="text-sm text-text-muted">{t('kit.completeness')}</p>
        </div>
      )}

      {/* B: Missing essentials */}
      {missingCategories.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-200">
            {t('kit.missingEssentials')}
          </p>
          <ul className="space-y-1">
            {missingCategories.slice(0, 5).map((step) => (
              <li key={step.categoryId}>
                <button
                  type="button"
                  className="text-sm text-amber-700 underline hover:no-underline dark:text-amber-300"
                  onClick={() => scrollToEquipmentAndCategory(step.categoryId)}
                >
                  {t('kit.addMore')} – {step.stepTitle || step.categoryName}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* C: Selected items list */}
      <div className="mb-4 max-h-[200px] space-y-2 overflow-y-auto border-b border-border-light pb-3">
        {Object.entries(selectedEquipment).map(([id, item]) => (
          <div
            key={id}
            className="flex items-center gap-2 text-sm"
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-white">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-text-heading">{item.model ?? id}</p>
              <p className="text-xs text-text-muted">
                {item.qty} × {formatSar(item.dailyPrice)}/day
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 text-text-muted hover:text-destructive"
              onClick={() => removeEquipment(id)}
              aria-label={t('kit.remove')}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* D: Pricing */}
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-text-muted">{t('kit.items')}</dt>
          <dd className="font-medium">{totalUnits} {t('kit.items')}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-muted">{t('kit.duration')}</dt>
          <dd>{durationDays} {durationDays === 1 ? t('kit.day') : t('kit.days')}</dd>
        </div>
        <div className="flex justify-between border-t border-border-light pt-2">
          <dt className="text-text-muted">{t('kit.subtotal')}</dt>
          <dd>{formatSar(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-muted">{t('kit.vat')}</dt>
          <dd>{formatSar(vatAmount)}</dd>
        </div>
        <div className="flex justify-between border-t border-border-light pt-2 font-semibold">
          <dt>{t('kit.total')}</dt>
          <dd>{formatSar(total)}</dd>
        </div>
        <div className="flex justify-between text-xs text-text-muted">
          <dt>{t('kit.dailyRate')}</dt>
          <dd>{formatSar(dailyAverage)}/day avg</dd>
        </div>
      </dl>

      {/* E: Free delivery threshold */}
      <div className="my-4">
        {gapToFreeDelivery > 0 ? (
          <>
            <Progress value={freeDeliveryProgress} className="h-2" />
            <p className="mt-1 text-xs text-text-muted">
              {t('kit.addMore')} {formatSar(gapToFreeDelivery)} {t('kit.freeDelivery')}
            </p>
          </>
        ) : (
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            {t('kit.freeDeliveryUnlocked')}
          </p>
        )}
      </div>

      {/* F: CTA */}
      <div className="mt-auto space-y-2 pt-2">
        <Button
          className="w-full bg-brand-primary hover:bg-brand-primary-hover"
          onClick={scrollToReview}
        >
          {t('kit.addAllToCart')} ({formatSar(total)})
        </Button>
        <Button variant="outline" className="w-full" onClick={scrollToReview}>
          {t('kit.reviewKit')}
        </Button>
      </div>
    </div>
  )
}
