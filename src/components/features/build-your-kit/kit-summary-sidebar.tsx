/**
 * Sticky sidebar for kit wizard – category grouping, daily rate, duration,
 * subtotal, VAT, total, and "still to choose" when in category flow.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import {
  useKitWizardStore,
  getKitWizardTotalDaily,
  getKitWizardTotalAmount,
  getKitWizardSelectedCount,
} from '@/lib/stores/kit-wizard.store'
import { cn } from '@/lib/utils'

const VAT_RATE = 0.15

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function KitSummarySidebar({ className }: { className?: string }) {
  const { t } = useLocale()
  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)
  const durationDays = useKitWizardStore((s) => s.durationDays)
  const shootTypeData = useKitWizardStore((s) => s.shootTypeData)
  const budgetTier = useKitWizardStore((s) => s.budgetTier)
  const categorySteps = useKitWizardStore((s) => s.categorySteps)
  const currentCategoryIndex = useKitWizardStore((s) => s.currentCategoryIndex)
  const skippedCategories = useKitWizardStore((s) => s.skippedCategories)
  const phase = useKitWizardStore((s) => s.phase)

  const itemCount = getKitWizardSelectedCount({ selectedEquipment })
  const totalUnits = Object.values(selectedEquipment).reduce((sum, { qty }) => sum + qty, 0)
  const totalDaily = getKitWizardTotalDaily({ selectedEquipment })
  const subtotal = getKitWizardTotalAmount({ selectedEquipment, durationDays })
  const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100
  const total = subtotal + vatAmount

  const categoryIdToName = new Map(
    categorySteps.map((s) => [s.categoryId, s.stepTitle || s.categoryName])
  )
  const byCategory = new Map<string, { name: string; daily: number; count: number }>()
  for (const [id, item] of Object.entries(selectedEquipment)) {
    const catId = item.categoryId ?? 'other'
    const name = categoryIdToName.get(catId) ?? 'Other'
    const daily = item.qty * item.dailyPrice
    const existing = byCategory.get(catId)
    if (existing) {
      existing.daily += daily
      existing.count += item.qty
    } else {
      byCategory.set(catId, { name, daily, count: item.qty })
    }
  }

  const remainingSteps =
    phase === 'categories'
      ? categorySteps
          .slice(currentCategoryIndex + 1)
          .filter((s) => !skippedCategories.includes(s.categoryId))
      : []
  const stillToChooseNames = remainingSteps.map(
    (s) => s.stepTitle || s.categoryName
  )

  if (itemCount === 0) {
    return (
      <div
        className={cn(
          'sticky top-24 rounded-lg border border-border-light bg-surface-light p-4 shadow-sm',
          className
        )}
      >
        <h3 className="mb-2 text-lg font-semibold text-text-heading">
          {shootTypeData?.name ? `${shootTypeData.name} – ${t('kit.summaryTitle')}` : t('kit.summaryTitle')}
        </h3>
        <p className="text-sm text-text-muted">{t('kit.emptyKit')}</p>
        {stillToChooseNames.length > 0 && (
          <p className="mt-3 text-sm text-text-muted">
            {t('kit.stillToChoose')}: {stillToChooseNames.join(', ')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'sticky top-24 rounded-lg border border-border-light bg-surface-light p-4 shadow-sm',
        className
      )}
    >
      <h3 className="mb-4 text-lg font-semibold text-text-heading">
        {shootTypeData?.name ? `${shootTypeData.name} – ${t('kit.summaryTitle')}` : t('kit.summaryTitle')}
      </h3>

      {byCategory.size > 0 && (
        <dl className="mb-4 space-y-2 border-b border-border-light pb-3 text-sm">
          {Array.from(byCategory.entries()).map(([catId, { name, daily, count }]) => (
            <div key={catId} className="flex justify-between">
              <dt className="text-text-muted">
                {name} ({count})
              </dt>
              <dd>{formatSar(daily)}/day</dd>
            </div>
          ))}
        </dl>
      )}

      {stillToChooseNames.length > 0 && (
        <p className="mb-3 text-sm text-text-muted">
          {t('kit.stillToChoose')}: {stillToChooseNames.join(', ')}
        </p>
      )}

      {phase === 'categories' && budgetTier && budgetTier !== 'PREMIUM' && (
        <p className="mb-3 text-xs text-brand-primary">
          {t('kit.upgradeToTier')}
        </p>
      )}

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-text-muted">{t('kit.items')}</dt>
          <dd className="font-medium">
            {totalUnits} {t('kit.items')}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-muted">{t('kit.dailyRate')}</dt>
          <dd>{formatSar(totalDaily)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-muted">{t('kit.duration')}</dt>
          <dd>
            {durationDays} {durationDays === 1 ? t('kit.day') : t('kit.days')}
          </dd>
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
      </dl>
    </div>
  )
}
