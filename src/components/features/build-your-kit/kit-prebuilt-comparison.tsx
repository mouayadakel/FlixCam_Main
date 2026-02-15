/**
 * Pre-built kit comparison card: shows similar kits with overlap and savings.
 * Used on the summary step.
 */

'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'

export interface PrebuiltKitMatch {
  id: string
  name: string
  slug: string
  description: string | null
  discountPercent: number | null
  itemCount: number
  totalDaily: number
  totalWithDiscount: number
  savingsPercent: number
  equipmentIds: string[]
}

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

interface KitPrebuiltComparisonProps {
  matchingKits: PrebuiltKitMatch[]
  customKitDaily: number
  durationDays: number
  loading?: boolean
}

export function KitPrebuiltComparison({
  matchingKits,
  customKitDaily,
  durationDays,
  loading = false,
}: KitPrebuiltComparisonProps) {
  const { t } = useLocale()

  if (loading) {
    return (
      <div className="rounded-xl border border-border-light bg-surface-light p-4">
        <p className="text-sm text-text-muted">{t('common.loading')}</p>
      </div>
    )
  }

  if (matchingKits.length === 0) return null

  return (
    <div className="rounded-xl border border-border-light bg-surface-light p-4">
      <h3 className="font-semibold text-text-heading mb-2">{t('kit.prebuiltMatch')}</h3>
      <p className="text-sm text-text-muted mb-3">{t('kit.prebuiltSavings')}</p>
      <ul className="space-y-3">
        {matchingKits.slice(0, 2).map((kit) => {
          const kitPerDay = kit.totalWithDiscount
          const customTotal = customKitDaily * durationDays
          const kitTotal = kitPerDay * durationDays
          const savingsAmount = Math.max(0, customTotal - kitTotal)
          const perDay = kitPerDay
          return (
            <li
              key={kit.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b border-border-light last:border-0"
            >
              <div>
                <p className="font-medium text-text-heading">{kit.name}</p>
                <p className="text-sm text-text-muted">
                  {formatSar(perDay)}/day
                  {kit.savingsPercent > 0 &&
                    ` · ${t('kit.youSave').replace('{percent}', String(kit.savingsPercent))}`}
                </p>
                {savingsAmount > 0 && (
                  <p className="text-xs text-brand-primary mt-0.5">
                    {t('kit.saveAmount').replace('{amount}', formatSar(savingsAmount))}
                  </p>
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href={`/packages/${kit.slug}`}>{t('kit.switchToKit')}</Link>
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
