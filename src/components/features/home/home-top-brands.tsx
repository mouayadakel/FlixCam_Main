/**
 * Homepage Top Brands – modern grid of brands with logo, name, product count.
 * Hover effects and clean card design.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { isExternalImageUrl } from '@/lib/utils/image.utils'
import { PublicContainer } from '@/components/public/public-container'

interface BrandItem {
  id: string
  name: string
  slug: string | null
  description: string | null
  logo: string | null
  equipmentCount: number
}

export function HomeTopBrands() {
  const { t } = useLocale()
  const [brands, setBrands] = useState<BrandItem[]>([])
  const [loading, setLoading] = useState(true)
  const [failedLogoIds, setFailedLogoIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    fetch('/api/public/brands')
      .then((res) => res.json())
      .then((json) => {
        setBrands(Array.isArray(json?.data) ? json.data : [])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="py-16 md:py-20 lg:py-24 bg-white border-t border-border-light/50">
      <PublicContainer>
        <div className="mb-10 text-center">
          <h2 className="text-section-title text-text-heading">
            {t('home.topBrandsTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-body-main text-text-body">
            {t('home.heroSubtitle')}
          </p>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center rounded-2xl border border-border-light/60 bg-surface-light p-6"
              >
                <div className="h-12 w-12 animate-pulse rounded-xl bg-border-light" />
                <div className="mt-3 h-4 w-16 animate-pulse rounded-md bg-border-light" />
                <div className="mt-1.5 h-3 w-12 animate-pulse rounded-md bg-border-light" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">
            {brands.slice(0, 12).map((brand, index) => (
              <Link
                key={brand.id}
                href={`/equipment?brandId=${brand.id}`}
                className="group flex flex-col items-center rounded-2xl border border-border-light/60 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:border-brand-primary/10 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${0.05 * index}s` }}
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-light transition-transform duration-300 group-hover:scale-110">
                  {brand.logo && !failedLogoIds.has(brand.id) ? (
                    <Image
                      src={brand.logo}
                      alt=""
                      fill
                      className="object-contain p-1"
                      sizes="56px"
                      unoptimized={isExternalImageUrl(brand.logo)}
                      onError={() => setFailedLogoIds((prev) => new Set(prev).add(brand.id))}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-base font-bold text-brand-primary">
                      {brand.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="mt-3 text-center text-sm font-semibold text-text-heading group-hover:text-brand-primary transition-colors">
                  {brand.name}
                </p>
                <p className="mt-0.5 text-label-small text-text-muted">
                  {brand.equipmentCount} {t('common.productsCount')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </PublicContainer>
    </section>
  )
}
