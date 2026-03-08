/**
 * Package/kit card for list (Phase 2.5).
 */

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { getLocalizedName } from '@/lib/i18n/content-helper'

interface PackageCardProps {
  pkg: {
    id: string
    name: string
    nameEn?: string | null
    nameZh?: string | null
    slug: string
    description: string | null
    descriptionEn?: string | null
    descriptionZh?: string | null
    discountPercent: number | null
    itemCount: number
  }
}

export function PackageCard({ pkg }: PackageCardProps) {
  const { t, locale } = useLocale()
  const displayName = getLocalizedName(pkg as any, locale) || pkg.name

  return (
    <Link
      href={`/packages/${pkg.slug}`}
      className="block rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
    >
      <h2 className="font-semibold">{displayName}</h2>
      {pkg.itemCount > 0 && (
        <p className="mt-1 text-sm text-muted-foreground">{pkg.itemCount} items</p>
      )}
      {pkg.discountPercent != null && pkg.discountPercent > 0 && (
        <span className="mt-2 inline-block text-sm font-medium text-green-600 dark:text-green-400">
          {pkg.discountPercent}% off
        </span>
      )}
    </Link>
  )
}
