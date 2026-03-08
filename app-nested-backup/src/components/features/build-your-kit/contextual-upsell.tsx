/**
 * Rule-based contextual upsells: missing lens, missing audio, bundle proximity,
 * duration play, premium alternative. Rendered between AI Starter and Equipment Grid.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import {
  useKitWizardStore,
  getKitWizardTotalAmount,
  getMissingCategories,
  getSelectedByCategory,
} from '@/lib/stores/kit-wizard.store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const FREE_DELIVERY_THRESHOLD_SAR = 2000

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

type UpsellRule = {
  id: string
  messageKey: string
  messagePayload?: Record<string, string | number>
  categoryId?: string
  variant: 'default' | 'warning' | 'success'
}

export function ContextualUpsell() {
  const { t } = useLocale()
  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)
  const durationDays = useKitWizardStore((s) => s.durationDays)
  const categorySteps = useKitWizardStore((s) => s.categorySteps)
  const shootTypeData = useKitWizardStore((s) => s.shootTypeData)
  const setActiveCategory = useKitWizardStore((s) => s.setActiveCategory)
  const setView = useKitWizardStore((s) => s.setView)

  const total = getKitWizardTotalAmount({ selectedEquipment, durationDays })
  const missingCategories = getMissingCategories({ categorySteps, selectedEquipment })
  const byCategory = getSelectedByCategory({ selectedEquipment })
  const selectedCategoryIds = new Set(byCategory.keys())

  const rules: UpsellRule[] = []

  const hasCamera = categorySteps.some(
    (s) =>
      selectedCategoryIds.has(s.categoryId) &&
      (s.categoryName.toLowerCase().includes('camera') ||
        s.stepTitle?.toLowerCase().includes('camera'))
  )
  const missingLens = missingCategories.find(
    (s) =>
      s.categoryName.toLowerCase().includes('lens') || s.stepTitle?.toLowerCase().includes('lens')
  )
  if (hasCamera && missingLens) {
    rules.push({
      id: 'missing-lens',
      messageKey: 'kit.upsellMissingLens',
      categoryId: missingLens.categoryId,
      variant: 'default',
    })
  }

  const missingAudio = missingCategories.find(
    (s) =>
      s.categoryName.toLowerCase().includes('audio') ||
      s.categoryName.toLowerCase().includes('mic') ||
      s.stepTitle?.toLowerCase().includes('audio') ||
      s.stepTitle?.toLowerCase().includes('mic')
  )
  if (missingAudio && shootTypeData?.name) {
    rules.push({
      id: 'missing-audio',
      messageKey: 'kit.upsellMissingAudio',
      messagePayload: { shootType: shootTypeData.name },
      categoryId: missingAudio.categoryId,
      variant: 'warning',
    })
  }

  if (durationDays === 3) {
    rules.push({
      id: 'duration-play',
      messageKey: 'kit.upsellDurationPlay',
      variant: 'success',
    })
  }

  const gapToFreeDelivery = FREE_DELIVERY_THRESHOLD_SAR - total
  if (gapToFreeDelivery > 0 && total >= FREE_DELIVERY_THRESHOLD_SAR * 0.85) {
    rules.push({
      id: 'bundle-proximity',
      messageKey: 'kit.upsellBundleProximity',
      messagePayload: { amount: formatSar(gapToFreeDelivery) },
      variant: 'success',
    })
  }

  const scrollToCategory = (categoryId: string) => {
    setView('building')
    setActiveCategory(categoryId)
    document.getElementById('equipment-browse')?.scrollIntoView({ behavior: 'smooth' })
  }

  if (rules.length === 0) return null

  const interpolate = (raw: string, payload: Record<string, string | number>): string =>
    Object.entries(payload).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      raw
    )

  return (
    <section className="animate-fade-in space-y-3">
      {rules.map((rule) => {
        const raw = t(rule.messageKey)
        const message = rule.messagePayload
          ? interpolate(raw, rule.messagePayload as Record<string, string | number>)
          : raw
        return (
          <div
            key={rule.id}
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4',
              rule.variant === 'warning' &&
                'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
              rule.variant === 'success' &&
                'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
              rule.variant === 'default' && 'border-border-light bg-surface-light'
            )}
          >
            <p className="text-sm font-medium text-text-heading">{message}</p>
            {rule.categoryId && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => scrollToCategory(rule.categoryId!)}
              >
                {t('kit.addMore')}
              </Button>
            )}
          </div>
        )
      })}
    </section>
  )
}
