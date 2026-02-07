/**
 * Homepage Top Brands – grid of brands with logo, name, product count.
 * Data from GET /api/public/brands.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
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

  useEffect(() => {
    fetch('/api/public/brands')
      .then((res) => res.json())
      .then((json) => {
        setBrands(Array.isArray(json?.data) ? json.data : [])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="py-12 md:py-16 lg:py-20 border-t border-border-light">
      <PublicContainer>
        <h2 className="mb-8 text-section-title text-text-heading">
          {t('home.topBrandsTitle')}
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center rounded-public-card border border-border-light bg-surface-light p-4"
              >
                <div className="h-12 w-12 animate-pulse rounded bg-border-light" />
                <div className="mt-2 h-4 w-16 animate-pulse rounded bg-border-light" />
                <div className="mt-1 h-3 w-12 animate-pulse rounded bg-border-light" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-6">
            {brands.slice(0, 12).map((brand) => (
              <Link
                key={brand.id}
                href={`/equipment?brandId=${brand.id}`}
                className="flex flex-col items-center rounded-public-card border border-border-light bg-white p-4 transition-[box-shadow,transform] hover:shadow-card-hover motion-reduce:transition-none [@media(pointer:fine)]:hover:-translate-y-0.5"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-surface-light">
                  {brand.logo ? (
                    <Image
                      src={brand.logo}
                      alt=""
                      fill
                      className="object-contain"
                      sizes="48px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-label-small font-semibold text-brand-primary">
                      {brand.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-center text-card-title text-brand-primary">
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
