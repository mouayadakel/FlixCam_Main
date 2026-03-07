/**
 * Homepage New Arrivals section – latest 8 equipment items in same grid structure as Featured.
 */

'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { isExternalImageUrl } from '@/lib/utils/image.utils'
import { PublicContainer } from '@/components/public/public-container'
import { Button } from '@/components/ui/button'
import { ArrowRight, Eye } from 'lucide-react'

const EQUIPMENT_PLACEHOLDER_IMAGE = '/images/placeholder.jpg'

interface NewArrivalsItem {
  id: string
  sku: string | null
  model: string | null
  dailyPrice: number
  quantityAvailable: number | null
  category: { name: string; slug: string } | null
  brand: { name: string; slug: string } | null
  media: { url: string; type: string }[]
}

interface HomeNewArrivalsProps {
  items: NewArrivalsItem[]
}

export function HomeNewArrivals({ items }: HomeNewArrivalsProps) {
  const { t } = useLocale()
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(() => new Set())
  const handleImageError = useCallback((itemId: string) => {
    setFailedImageIds((prev) => new Set(prev).add(itemId))
  }, [])

  return (
    <section className="bg-white py-10 md:py-14">
      <PublicContainer>
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-section-title text-text-heading">{t('home.newArrivalsTitle')}</h2>
            <p className="mt-2 text-body-main text-text-body">{t('home.newArrivalsSubtitle')}</p>
          </div>
          <Button
            variant="ghost"
            className="hidden items-center gap-1 font-semibold text-brand-primary transition-colors hover:bg-brand-primary/5 hover:text-brand-primary-hover sm:inline-flex"
            asChild
          >
            <Link href="/equipment">
              {t('common.viewAll')}
              <ArrowRight className="ms-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {items.length === 0 ? (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl border border-border-light/60 bg-white shadow-card"
                >
                  <div className="aspect-[4/3] animate-pulse bg-border-light/40" />
                  <div className="space-y-3 p-4">
                    <div className="h-3 w-16 animate-pulse rounded-md bg-border-light/50" />
                    <div className="h-4 w-3/4 animate-pulse rounded-md bg-border-light/60" />
                    <div className="border-t border-border-light/60 pt-3">
                      <div className="h-5 w-24 animate-pulse rounded-md bg-border-light/50" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <p className="mb-3 text-sm text-text-muted">{t('home.newArrivalsEmptyMessage')}</p>
              <Link
                href="/equipment"
                className="inline-flex items-center gap-1 font-semibold text-brand-primary transition-colors hover:text-brand-primary-hover"
              >
                {t('home.newArrivalsEmptyCta')}
                <ArrowRight className="ms-1 h-4 w-4" />
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
              {items.slice(0, 8).map((item, index) => {
                const soldOut = (item.quantityAvailable ?? 0) <= 0
                return (
                  <Link
                    key={item.id}
                    href={`/equipment/${item.id}`}
                    className="group flex animate-fade-in-up flex-col overflow-hidden rounded-2xl border border-border-light/60 bg-white opacity-0 shadow-card transition-all duration-350 hover:-translate-y-1.5 hover:shadow-card-hover"
                    style={{ animationDelay: `${0.1 * index}s` }}
                  >
                    <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-surface-light">
                      {failedImageIds.has(item.id) ? (
                        <div className="absolute inset-0 bg-surface-light" aria-hidden />
                      ) : (
                        <Image
                          src={item.media[0]?.url || EQUIPMENT_PLACEHOLDER_IMAGE}
                          alt={item.model ?? item.sku ?? item.id}
                          fill
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          unoptimized={
                            !item.media[0]?.url || isExternalImageUrl(item.media[0]?.url)
                          }
                          onError={() => handleImageError(item.id)}
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/30">
                        <span className="flex translate-y-2 items-center gap-2 rounded-full bg-white/90 px-5 py-2.5 text-sm font-semibold text-text-heading opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                          <Eye className="h-4 w-4" />
                          {t('common.viewDetails') ?? 'View Details'}
                        </span>
                      </div>
                      {soldOut && (
                        <span className="absolute end-3 top-3 rounded-lg bg-sold-out/90 px-3 py-1 text-label-small uppercase text-white backdrop-blur-sm">
                          {t('common.unavailable')}
                        </span>
                      )}
                      {index === 0 && (
                        <span className="absolute start-3 top-3 rounded-lg bg-brand-primary px-3 py-1 text-label-small uppercase text-white shadow-sm">
                          New
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col p-4">
                      <p className="text-label-small uppercase tracking-wider text-text-muted">
                        {item.brand?.name ?? item.category?.name ?? '—'}
                      </p>
                      <p className="mt-1.5 truncate text-card-title text-text-heading transition-colors group-hover:text-brand-primary">
                        {item.model ?? item.sku ?? item.id}
                      </p>
                      <div className="mt-3 flex items-baseline gap-1.5 border-t border-border-light/60 pt-3">
                        <span className="text-price-tag text-brand-primary">
                          {item.dailyPrice > 0
                            ? `${Number(item.dailyPrice).toLocaleString()} SAR`
                            : '—'}
                        </span>
                        {item.dailyPrice > 0 && (
                          <span className="text-sm text-text-muted">
                            / {t('common.pricePerDay')}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Button
                variant="outline"
                className="rounded-xl border-brand-primary px-8 text-brand-primary transition-all hover:bg-brand-primary hover:text-white"
                asChild
              >
                <Link href="/equipment">
                  {t('common.viewAll')}
                  <ArrowRight className="ms-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </PublicContainer>
    </section>
  )
}
