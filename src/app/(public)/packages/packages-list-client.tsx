'use client'

import { useLocale } from '@/hooks/use-locale'
import { PackageCard } from '@/components/features/packages/package-card'

interface PackageItem {
  id: string
  name: string
  slug: string
  description: string | null
  discountPercent: number | null
  itemCount: number
}

export function PackagesListClient({ packages }: { packages: PackageItem[] }) {
  const { t } = useLocale()

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">{t('nav.packages')}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>
      {packages.length === 0 && (
        <p className="text-muted-foreground">{t('common.noResults')}</p>
      )}
    </>
  )
}
