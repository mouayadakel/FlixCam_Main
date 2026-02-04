/**
 * Equipment price block (Phase 2.3).
 */

'use client'

import { useLocale } from '@/hooks/use-locale'

interface EquipmentPriceBlockProps {
  dailyPrice: number
  weeklyPrice: number | null
  monthlyPrice: number | null
}

export function EquipmentPriceBlock({
  dailyPrice,
  weeklyPrice,
  monthlyPrice,
}: EquipmentPriceBlockProps) {
  const { t } = useLocale()

  const format = (n: number) => `${n.toLocaleString()} SAR`

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <p className="text-2xl font-semibold">
        {dailyPrice > 0 ? `${format(dailyPrice)} / ${t('common.pricePerDay')}` : '—'}
      </p>
      {weeklyPrice != null && weeklyPrice > 0 && (
        <p className="text-sm text-muted-foreground">Weekly: {format(weeklyPrice)}</p>
      )}
      {monthlyPrice != null && monthlyPrice > 0 && (
        <p className="text-sm text-muted-foreground">Monthly: {format(monthlyPrice)}</p>
      )}
    </div>
  )
}
