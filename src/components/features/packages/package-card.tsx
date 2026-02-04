/**
 * Package/kit card for list (Phase 2.5).
 */

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'

interface PackageCardProps {
  pkg: {
    id: string
    name: string
    slug: string
    description: string | null
    discountPercent: number | null
    itemCount: number
  }
}

export function PackageCard({ pkg }: PackageCardProps) {
  const { t } = useLocale()

  return (
    <Link
      href={`/packages/${pkg.slug}`}
      className="block rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
    >
      <h2 className="font-semibold">{pkg.name}</h2>
      {pkg.itemCount > 0 && (
        <p className="text-sm text-muted-foreground mt-1">{pkg.itemCount} items</p>
      )}
      {pkg.discountPercent != null && pkg.discountPercent > 0 && (
        <span className="inline-block mt-2 text-sm font-medium text-green-600 dark:text-green-400">
          {pkg.discountPercent}% off
        </span>
      )}
    </Link>
  )
}
