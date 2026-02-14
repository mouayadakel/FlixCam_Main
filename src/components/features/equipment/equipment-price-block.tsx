/**
 * Equipment price block – tiered pricing display (daily / weekly / monthly)
 * with best-value highlight and clean card layout.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { cn } from '@/lib/utils'
import { Tag, TrendingDown } from 'lucide-react'

interface EquipmentPriceBlockProps {
  dailyPrice: number
  weeklyPrice: number | null
  monthlyPrice: number | null
}

interface PriceTier {
  label: string
  price: number
  perDay: number
  isBestValue: boolean
}

export function EquipmentPriceBlock({
  dailyPrice,
  weeklyPrice,
  monthlyPrice,
}: EquipmentPriceBlockProps) {
  const { t } = useLocale()

  const format = (n: number) => `${n.toLocaleString()} SAR`

  if (dailyPrice <= 0) {
    return (
      <div className="rounded-2xl border border-border-light/60 bg-surface-light p-5">
        <p className="text-lg font-semibold text-text-muted">&mdash;</p>
      </div>
    )
  }

  // Build tier list
  const tiers: PriceTier[] = [
    {
      label: t('common.pricePerDay') ?? 'Day',
      price: dailyPrice,
      perDay: dailyPrice,
      isBestValue: false,
    },
  ]

  if (weeklyPrice != null && weeklyPrice > 0) {
    tiers.push({
      label: 'Week',
      price: weeklyPrice,
      perDay: Math.round(weeklyPrice / 7),
      isBestValue: false,
    })
  }

  if (monthlyPrice != null && monthlyPrice > 0) {
    tiers.push({
      label: 'Month',
      price: monthlyPrice,
      perDay: Math.round(monthlyPrice / 30),
      isBestValue: false,
    })
  }

  // Mark best value (lowest per-day cost, must have more than daily)
  if (tiers.length > 1) {
    let bestIdx = 0
    let minPerDay = tiers[0].perDay
    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].perDay < minPerDay) {
        minPerDay = tiers[i].perDay
        bestIdx = i
      }
    }
    tiers[bestIdx].isBestValue = true
  }

  // Single tier — show simple block
  if (tiers.length === 1) {
    return (
      <div className="rounded-2xl border border-border-light/60 bg-white p-5 shadow-card">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-brand-primary">
            {format(dailyPrice)}
          </span>
          <span className="text-sm font-medium text-text-muted">
            / {t('common.pricePerDay')}
          </span>
        </div>
      </div>
    )
  }

  // Multiple tiers — show tier cards
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Tag className="h-4 w-4" />
        <span className="font-medium">Rental pricing</span>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tiers.length}, minmax(0, 1fr))` }}>
        {tiers.map((tier) => (
          <div
            key={tier.label}
            className={cn(
              'relative rounded-xl border p-4 text-center transition-all duration-200',
              tier.isBestValue
                ? 'border-brand-primary bg-brand-primary-light shadow-md ring-1 ring-brand-primary/20'
                : 'border-border-light/60 bg-white hover:border-border-light hover:shadow-card'
            )}
          >
            {tier.isBestValue && (
              <span className="absolute -top-2.5 inset-x-0 mx-auto w-fit rounded-full bg-brand-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Best Value
              </span>
            )}
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mt-1">
              {tier.label}
            </p>
            <p className={cn(
              'mt-2 text-xl font-extrabold tracking-tight',
              tier.isBestValue ? 'text-brand-primary' : 'text-text-heading'
            )}>
              {format(tier.price)}
            </p>
            {tiers.length > 1 && (
              <p className="mt-1 text-xs text-text-muted">
                ~{format(tier.perDay)}/{t('common.pricePerDay') ?? 'day'}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
