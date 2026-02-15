/**
 * Bar showing selected item count and total. Shown when at least one item is in the kit.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import {
  useKitWizardStore,
  getKitWizardTotalAmount,
  getKitWizardSelectedCount,
} from '@/lib/stores/kit-wizard.store'
import { Button } from '@/components/ui/button'

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function BulkActionsBar() {
  const { t } = useLocale()
  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)
  const durationDays = useKitWizardStore((s) => s.durationDays)
  const setView = useKitWizardStore((s) => s.setView)

  const selectedCount = getKitWizardSelectedCount({ selectedEquipment })
  const totalAmount = getKitWizardTotalAmount({ selectedEquipment, durationDays })
  const vatAmount = Math.round(totalAmount * 0.15 * 100) / 100
  const totalWithVat = totalAmount + vatAmount
  const totalUnits = Object.values(selectedEquipment).reduce((sum, { qty }) => sum + qty, 0)

  if (selectedCount === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border-light bg-surface-light p-4">
      <div>
        <p className="text-sm font-medium text-text-heading">
          {totalUnits} {t('kit.items')} selected · {formatSar(totalWithVat)} ({durationDays} {t('kit.days')})
        </p>
        <p className="text-xs text-text-muted">
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'} in your kit
        </p>
      </div>
      <Button
        size="sm"
        className="bg-brand-primary hover:bg-brand-primary-hover"
        onClick={() => {
          setView('review')
          document.getElementById('review')?.scrollIntoView({ behavior: 'smooth' })
        }}
      >
        {t('kit.stepSummary')}
      </Button>
    </div>
  )
}
