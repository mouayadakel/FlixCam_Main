/**
 * Studio package cards: Figma-quality pricing tier cards
 * Accessible radiogroup for package selection
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { Clock, Sparkles, Check, ShieldCheck } from 'lucide-react'
import type { StudioPackage, StudioPublicData } from '@/lib/types/studio.types'

interface StudioPackageCardsProps {
  packages: StudioPackage[]
  hourlyRate: number
  minHours: number
  cancellationPolicyShort: string | null
  selectedPackageId: string | null
  onSelectPackage: (id: string | null) => void
}

function parseIncludes(includes: string | null): string[] {
  if (!includes) return []
  try {
    const parsed = JSON.parse(includes)
    if (Array.isArray(parsed)) return parsed.slice(0, 4)
  } catch {
    // fallback: split by newline or bullet
    return includes
      .split(/\n|•|·/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4)
  }
  return []
}

export function StudioPackageCards({
  packages,
  hourlyRate,
  minHours,
  cancellationPolicyShort,
  selectedPackageId,
  onSelectPackage,
}: StudioPackageCardsProps) {
  const { t } = useLocale()

  const sortedPackages = [...packages].sort((a, b) => a.order - b.order)
  const recommendedPkg = sortedPackages.find((p) => p.recommended) || sortedPackages[0]

  const handleSelect = (id: string | null) => {
    onSelectPackage(id)
    // Smooth scroll to booking panel
    setTimeout(() => {
      const el = document.getElementById('booking-panel')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }

  // Determine grid columns based on count (hourly + packages)
  const totalCards = sortedPackages.length + 1
  const gridCols =
    totalCards <= 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : totalCards <= 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'

  return (
    <section id="package-section" className="space-y-5" dir="rtl">
      {/* Section heading */}
      <div>
        <h2 className="text-xl font-bold text-text-heading">{t('studios.choosePackageTitle')}</h2>
        <p className="mt-1 text-sm text-text-muted">{t('studios.choosePackageSubtitle')}</p>
      </div>

      {/* Cards grid */}
      <fieldset
        role="radiogroup"
        aria-label={t('studios.choosePackageTitle')}
        className="m-0 border-none p-0"
      >
        <legend className="sr-only">{t('studios.choosePackageTitle')}</legend>

        <div className={`grid gap-4 ${gridCols}`}>
          {/* Hourly card */}
          <HourlyCard
            hourlyRate={hourlyRate}
            minHours={minHours}
            isSelected={selectedPackageId === null}
            onSelect={() => handleSelect(null)}
            index={0}
          />

          {/* Package cards */}
          {sortedPackages.map((pkg, i) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              isSelected={selectedPackageId === pkg.id}
              isRecommended={recommendedPkg?.id === pkg.id}
              onSelect={() => handleSelect(pkg.id)}
              index={i + 1}
            />
          ))}
        </div>
      </fieldset>

      {/* Trust line */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <ShieldCheck className="h-4 w-4 shrink-0 text-success-600" />
        <span>{cancellationPolicyShort || t('studios.trustCancellation')}</span>
      </div>
    </section>
  )
}

/* ─── Hourly Card ─── */

interface HourlyCardProps {
  hourlyRate: number
  minHours: number
  isSelected: boolean
  onSelect: () => void
  index: number
}

function HourlyCard({ hourlyRate, minHours, isSelected, onSelect, index }: HourlyCardProps) {
  const { t } = useLocale()

  return (
    <label
      className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border-2 p-5 transition-all duration-300 ${
        isSelected
          ? 'border-primary bg-primary-50/30 shadow-lg ring-2 ring-primary/20'
          : 'border-border-light/40 bg-white shadow-sm hover:-translate-y-1 hover:border-primary/30 hover:shadow-md'
      } `}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <input
        type="radio"
        name="studio-package"
        value="hourly"
        checked={isSelected}
        onChange={onSelect}
        className="sr-only"
        aria-checked={isSelected}
      />

      <div className="space-y-3">
        {/* Duration icon */}
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-surface-light px-3 py-1.5 text-xs font-medium text-text-muted">
          <Clock className="h-3.5 w-3.5" />
          {minHours > 1 ? `${minHours}+ ساعات` : 'مرن'}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-text-heading">{t('studios.hourlyOption')}</h3>

        {/* Price */}
        <div className="text-2xl font-bold text-primary">
          {Number(hourlyRate).toLocaleString()}{' '}
          <span className="text-sm font-normal text-text-muted">ر.س/ساعة</span>
        </div>

        {/* Subtitle */}
        <p className="text-sm text-text-muted">{t('studios.hourlyOptionDesc')}</p>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onSelect}
        className={`mt-4 w-full rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
          isSelected
            ? 'bg-primary text-white'
            : 'border border-primary/20 bg-primary-50 text-primary hover:bg-primary hover:text-white'
        } `}
      >
        {isSelected ? (
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4" />
            {t('studios.packageSelected')}
          </span>
        ) : (
          t('studios.bookThisPackage')
        )}
      </button>
    </label>
  )
}

/* ─── Package Card ─── */

interface PackageCardProps {
  pkg: StudioPackage
  isSelected: boolean
  isRecommended: boolean
  onSelect: () => void
  index: number
}

function PackageCard({ pkg, isSelected, isRecommended, onSelect, index }: PackageCardProps) {
  const { t } = useLocale()
  const includesList = parseIncludes(pkg.includes)
  const savings =
    pkg.originalPrice && pkg.originalPrice > pkg.price ? pkg.originalPrice - pkg.price : 0
  const badgeLabel = pkg.badgeText || t('studios.mostPopular')

  return (
    <label
      className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border-2 p-5 transition-all duration-300 ${
        isSelected
          ? 'border-primary bg-primary-50/30 shadow-lg ring-2 ring-primary/20'
          : 'border-border-light/40 bg-white shadow-sm hover:-translate-y-1 hover:border-primary/30 hover:shadow-md'
      } ${isRecommended && !isSelected ? 'scale-[1.02]' : ''} `}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <input
        type="radio"
        name="studio-package"
        value={pkg.id}
        checked={isSelected}
        onChange={onSelect}
        className="sr-only"
        aria-checked={isSelected}
      />

      {/* Recommended badge */}
      {isRecommended && (
        <span className="absolute -top-3 start-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-primary to-primary/80 px-4 py-1 text-xs font-bold text-white shadow-sm">
          <Sparkles className="h-3 w-3" />
          {badgeLabel}
        </span>
      )}

      <div className="space-y-3">
        {/* Duration */}
        {pkg.hours != null && (
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-surface-light px-3 py-1.5 text-xs font-medium text-text-muted">
            <Clock className="h-3.5 w-3.5" />
            {pkg.hours} {pkg.hours === 1 ? 'ساعة' : 'ساعات'}
          </div>
        )}

        {/* Name */}
        <h3 className="text-lg font-semibold text-text-heading">{pkg.nameAr || pkg.name}</h3>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">
            {Number(pkg.price).toLocaleString()} <span className="text-sm font-normal">ر.س</span>
          </span>
          {pkg.originalPrice != null && pkg.originalPrice > pkg.price && (
            <span className="text-sm text-text-muted line-through">
              {Number(pkg.originalPrice).toLocaleString()}
            </span>
          )}
        </div>

        {/* Savings */}
        {savings > 0 && (
          <span className="inline-block rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-700">
            {t('studios.savingsLabel').replace('{amount}', String(Math.round(savings)))}
          </span>
        )}

        {/* Discount badge */}
        {pkg.discountPercent != null && pkg.discountPercent > 0 && (
          <span className="inline-block rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
            خصم {pkg.discountPercent}%
          </span>
        )}

        {/* Includes */}
        {includesList.length > 0 && (
          <div className="border-t border-border-light/30 pt-3">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-text-muted">
              {t('studios.includes')}
            </p>
            <ul className="space-y-1">
              {includesList.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-xs text-text-body">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-success-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onSelect}
        className={`mt-4 w-full rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
          isSelected
            ? 'bg-primary text-white'
            : isRecommended
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'border border-primary/20 bg-primary-50 text-primary hover:bg-primary hover:text-white'
        } `}
      >
        {isSelected ? (
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4" />
            {t('studios.packageSelected')}
          </span>
        ) : (
          t('studios.bookThisPackage')
        )}
      </button>
    </label>
  )
}
