/**
 * Sticky sidebar for kit wizard – live item count, daily rate, duration, subtotal, VAT, total.
 * Desktop only; hidden on mobile (use floating bar in main wizard).
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

  const itemCount = getKitWizardSelectedCount({ selectedEquipment })
  const totalUnits = Object.values(selectedEquipment).reduce((sum, { qty }) => sum + qty, 0)
  const totalDaily = getKitWizardTotalDaily({ selectedEquipment })
  const subtotal = getKitWizardTotalAmount({ selectedEquipment, durationDays })
  const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100
  const total = subtotal + vatAmount

  if (itemCount === 0) {
    return (
      <div
        className={cn(
          'sticky top-24 rounded-lg border border-border-light bg-surface-light p-4 shadow-sm',
          className
        )}
      >
        <h3 className="mb-2 text-lg font-semibold text-text-heading">
          {t('kit.summaryTitle')}
        </h3>
        <p className="text-sm text-text-muted">{t('kit.emptyKit')}</p>
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
        {t('kit.summaryTitle')}
      </h3>

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
