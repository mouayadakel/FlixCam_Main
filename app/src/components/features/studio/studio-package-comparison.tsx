/**
 * Studio package comparison table: side-by-side feature matrix
 * Shown below package cards for users who want detailed comparison
 */

'use client'

import { useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Check, X, ChevronDown, ChevronUp, Clock, Sparkles } from 'lucide-react'
import type { StudioPackage } from '@/lib/types/studio.types'

interface StudioPackageComparisonProps {
  packages: StudioPackage[]
  hourlyRate: number
  selectedPackageId: string | null
  onSelectPackage: (id: string | null) => void
}

function parseIncludes(includes: string | null): string[] {
  if (!includes) return []
  try {
    const parsed = JSON.parse(includes)
    if (Array.isArray(parsed)) return parsed
  } catch {
    return includes
      .split(/\n|•|·/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

function getAllFeatures(packages: StudioPackage[]): string[] {
  const featureSet = new Set<string>()
  for (const pkg of packages) {
    for (const item of parseIncludes(pkg.includes)) {
      featureSet.add(item)
    }
  }
  return Array.from(featureSet)
}

export function StudioPackageComparison({
  packages,
  hourlyRate,
  selectedPackageId,
  onSelectPackage,
}: StudioPackageComparisonProps) {
  const { t } = useLocale()
  const [isOpen, setIsOpen] = useState(false)

  const sorted = [...packages].sort((a, b) => a.order - b.order)
  const allFeatures = getAllFeatures(sorted)

  // Don't render if less than 2 packages or no features to compare
  if (sorted.length < 2 || allFeatures.length === 0) return null

  return (
    <section className="space-y-3" dir="rtl">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-border-light/40 bg-white px-5 py-3.5 text-sm font-semibold text-text-heading shadow-sm transition-colors hover:bg-surface-light"
      >
        <span>{t('studios.comparePackages')}</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="overflow-x-auto rounded-2xl border border-border-light/40 bg-white shadow-card">
          <table className="w-full min-w-[500px] text-sm">
            {/* Header row */}
            <thead>
              <tr className="border-b border-border-light/40">
                <th className="p-4 text-start text-xs font-medium uppercase tracking-wider text-text-muted">
                  {t('studios.feature')}
                </th>
                {/* Hourly column */}
                <th className="p-4 text-center">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1 text-xs text-text-muted">
                      <Clock className="h-3 w-3" />
                      {t('studios.hourlyOption')}
                    </div>
                    <p className="font-bold text-primary">
                      {Number(hourlyRate).toLocaleString()}{' '}
                      <span className="text-[10px] font-normal">ر.س/ساعة</span>
                    </p>
                  </div>
                </th>
                {/* Package columns */}
                {sorted.map((pkg) => {
                  const isSelected = selectedPackageId === pkg.id
                  const isRecommended = pkg.recommended
                  return (
                    <th
                      key={pkg.id}
                      className={`relative p-4 text-center ${isSelected ? 'bg-primary-50/30' : ''}`}
                    >
                      {isRecommended && (
                        <span className="absolute -top-0.5 start-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap rounded-b-lg bg-primary px-3 py-0.5 text-[10px] font-bold text-white">
                          <Sparkles className="h-2.5 w-2.5" />
                          {pkg.badgeText || t('studios.mostPopular')}
                        </span>
                      )}
                      <div className="space-y-1 pt-1">
                        <p className="font-semibold text-text-heading">{pkg.nameAr || pkg.name}</p>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-lg font-bold text-primary">
                            {Number(pkg.price).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-text-muted">ر.س</span>
                          {pkg.originalPrice != null && pkg.originalPrice > pkg.price && (
                            <span className="ms-1 text-[10px] text-text-muted line-through">
                              {Number(pkg.originalPrice).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {pkg.hours != null && (
                          <p className="text-[10px] text-text-muted">
                            {pkg.hours} {pkg.hours === 1 ? 'ساعة' : 'ساعات'}
                          </p>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* Feature rows */}
            <tbody>
              {allFeatures.map((feature, idx) => (
                <tr
                  key={feature}
                  className={`border-b border-border-light/20 ${idx % 2 === 0 ? 'bg-white' : 'bg-surface-light/30'}`}
                >
                  <td className="p-3 ps-4 text-text-body">{feature}</td>
                  {/* Hourly — no features included */}
                  <td className="p-3 text-center">
                    <X className="mx-auto h-4 w-4 text-neutral-300" />
                  </td>
                  {/* Package columns */}
                  {sorted.map((pkg) => {
                    const pkgFeatures = parseIncludes(pkg.includes)
                    const hasFeature = pkgFeatures.includes(feature)
                    const isSelected = selectedPackageId === pkg.id
                    return (
                      <td
                        key={pkg.id}
                        className={`p-3 text-center ${isSelected ? 'bg-primary-50/20' : ''}`}
                      >
                        {hasFeature ? (
                          <Check className="mx-auto h-4 w-4 text-success-600" />
                        ) : (
                          <X className="mx-auto h-4 w-4 text-neutral-300" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* Discount row */}
              <tr className="border-b border-border-light/20 bg-surface-light/30">
                <td className="p-3 ps-4 font-medium text-text-heading">
                  {t('studios.discountRow')}
                </td>
                <td className="p-3 text-center text-xs text-text-muted">—</td>
                {sorted.map((pkg) => {
                  const isSelected = selectedPackageId === pkg.id
                  return (
                    <td
                      key={pkg.id}
                      className={`p-3 text-center ${isSelected ? 'bg-primary-50/20' : ''}`}
                    >
                      {pkg.discountPercent != null && pkg.discountPercent > 0 ? (
                        <span className="inline-block rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-semibold text-success-700">
                          {pkg.discountPercent}%
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            </tbody>

            {/* CTA row */}
            <tfoot>
              <tr>
                <td className="p-4" />
                {/* Hourly CTA */}
                <td className="p-4 text-center">
                  <button
                    type="button"
                    onClick={() => onSelectPackage(null)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      selectedPackageId === null
                        ? 'bg-primary text-white'
                        : 'border border-primary/20 bg-primary-50 text-primary hover:bg-primary hover:text-white'
                    }`}
                  >
                    {selectedPackageId === null
                      ? t('studios.packageSelected')
                      : t('studios.selectLabel')}
                  </button>
                </td>
                {/* Package CTAs */}
                {sorted.map((pkg) => {
                  const isSelected = selectedPackageId === pkg.id
                  return (
                    <td
                      key={pkg.id}
                      className={`p-4 text-center ${isSelected ? 'bg-primary-50/20' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectPackage(pkg.id)}
                        className={`w-full rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-primary text-white'
                            : pkg.recommended
                              ? 'bg-primary text-white hover:bg-primary/90'
                              : 'border border-primary/20 bg-primary-50 text-primary hover:bg-primary hover:text-white'
                        }`}
                      >
                        {isSelected ? t('studios.packageSelected') : t('studios.selectLabel')}
                      </button>
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}
