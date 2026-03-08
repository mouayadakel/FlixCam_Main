/**
 * Equipment price block – tiered pricing display (daily / weekly / monthly)
 * with best-value highlight and clean card layout.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { cn } from '@/lib/utils'
import { Tag, TrendingDown } from 'lucide-react'

type TierKey = 'day' | 'week' | 'month'

interface EquipmentPriceBlockProps {
  dailyPrice: number
  weeklyPrice: number | null
  monthlyPrice: number | null
  onTierSelect?: (tier: TierKey) => void
  selectedTier?: TierKey | null
}

interface PriceTier {
  key: TierKey
  label: string
  price: number
  perDay: number
  isBestValue: boolean
}

export type { TierKey }

export function EquipmentPriceBlock({
  dailyPrice,
  weeklyPrice,
  monthlyPrice,
  onTierSelect,
  selectedTier,
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

  const isInteractive = !!onTierSelect

  // Build tier list
  const tiers: PriceTier[] = [
    {
      key: 'day',
      label: t('common.pricePerDay') ?? 'Day',
      price: dailyPrice,
      perDay: dailyPrice,
      isBestValue: false,
    },
  ]

  if (weeklyPrice != null && weeklyPrice > 0) {
    tiers.push({
      key: 'week',
      label: t('equipment.week'),
      price: weeklyPrice,
      perDay: Math.round(weeklyPrice / 7),
      isBestValue: false,
    })
  }

  if (monthlyPrice != null && monthlyPrice > 0) {
    tiers.push({
      key: 'month',
      label: t('equipment.month'),
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
          <span className="text-sm font-medium text-text-muted">/ {t('common.pricePerDay')}</span>
        </div>
      </div>
    )
  }

  // Multiple tiers — show tier cards (z-20 so they sit above element-picker overlays)
  return (
    <div className="relative z-20 space-y-2">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Tag className="h-4 w-4" />
        <span className="font-medium">{t('equipment.rentalPricing')}</span>
      </div>
      <div
        className="relative z-20 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${tiers.length}, minmax(0, 1fr))` }}
      >
        {tiers.map((tier) => {
          const isSelected = selectedTier === tier.key
          const cardClassName = cn(
            'relative z-20 min-h-[7.5rem] min-w-0 w-full rounded-xl border p-4 text-center transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
            isInteractive && 'cursor-pointer select-none pointer-events-auto',
            isSelected
              ? 'border-brand-primary bg-brand-primary-light shadow-md ring-2 ring-brand-primary/30'
              : tier.isBestValue
                ? 'border-brand-primary/40 bg-brand-primary-light/50 shadow-sm'
                : 'border-border-light/60 bg-white hover:border-border-light hover:shadow-card'
          )
          const content = (
            <>
              {tier.isBestValue && (
                <span className="absolute inset-x-0 -top-2.5 mx-auto flex w-fit items-center gap-1 rounded-full bg-brand-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                  <TrendingDown className="h-3 w-3" />
                  {t('equipment.bestValue')}
                </span>
              )}
              <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                {tier.label}
              </span>
              <span
                className={cn(
                  'mt-2 block text-xl font-extrabold tracking-tight',
                  tier.isBestValue ? 'text-brand-primary' : 'text-text-heading'
                )}
              >
                {format(tier.price)}
              </span>
              {tiers.length > 1 && (
                <span className="mt-1 block text-xs text-text-muted">
                  ~{format(tier.perDay)}/{t('common.pricePerDay') ?? 'day'}
                </span>
              )}
            </>
          )
          // Always use <button> for multi-tier so cards are always clickable (avoids cache/hydration showing div)
          return (
            <button
              key={tier.key}
              type="button"
              data-tier={tier.key}
              data-pricing-card
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onTierSelect?.(tier.key)
              }}
              className={cn(
                cardClassName,
                'appearance-none bg-inherit font-inherit cursor-pointer select-none pointer-events-auto'
              )}
              aria-label={`${tier.label}: ${format(tier.price)}`}
            >
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}
