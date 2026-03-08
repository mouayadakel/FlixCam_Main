/**
 * Homepage Featured Studios section – top 3 studios with image, rate, capacity.
 * Only renders when enable_studios feature flag is active.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { isExternalImageUrl } from '@/lib/utils/image.utils'
import { PublicContainer } from '@/components/public/public-container'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, Clock } from 'lucide-react'

const STUDIO_PLACEHOLDER = '/images/placeholder.jpg'

interface StudioItem {
  id: string
  name: string
  slug: string | null
  description: string | null
  capacity: number | null
  hourlyRate: number
  media: { id: string; url: string; type: string }[]
}

export function HomeStudios() {
  const { t } = useLocale()
  const [studios, setStudios] = useState<StudioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(() => new Set())
  const handleImageError = useCallback((id: string) => {
    setFailedImageIds((prev) => new Set(prev).add(id))
  }, [])

  useEffect(() => {
    fetch('/api/public/studios')
      .then((res) => res.json())
      .then((json) => {
        setStudios(Array.isArray(json?.data) ? json.data.slice(0, 3) : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && studios.length === 0) return null

  return (
    <section className="border-t border-border-light/50 bg-surface-light py-10 md:py-14">
      <PublicContainer>
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-section-title text-text-heading">{t('home.studiosTitle')}</h2>
            <p className="mt-2 text-body-main text-text-body">{t('home.studiosSubtitle')}</p>
          </div>
          <Button
            variant="ghost"
            className="hidden items-center gap-1 font-semibold text-brand-primary transition-colors hover:bg-brand-primary/5 hover:text-brand-primary-hover sm:inline-flex"
            asChild
          >
            <Link href="/studios">
              {t('common.viewAll')}
              <ArrowRight className="ms-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-border-light/60 bg-white shadow-card"
              >
                <div className="aspect-[16/10] animate-pulse bg-border-light/40" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-3/4 animate-pulse rounded-md bg-border-light/60" />
                  <div className="h-4 w-1/2 animate-pulse rounded-md bg-border-light/40" />
                  <div className="h-4 w-1/3 animate-pulse rounded-md bg-border-light/50" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {studios.map((studio, index) => {
              const href = `/studios/${studio.slug || studio.id}`
              const imgUrl = studio.media?.[0]?.url || STUDIO_PLACEHOLDER
              return (
                <Link
                  key={studio.id}
                  href={href}
                  className="group flex animate-fade-in-up flex-col overflow-hidden rounded-2xl border border-border-light/60 bg-white opacity-0 shadow-card transition-all duration-350 hover:-translate-y-1.5 hover:shadow-card-hover"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-surface-light">
                    {failedImageIds.has(studio.id) ? (
                      <div className="absolute inset-0 bg-surface-light" aria-hidden />
                    ) : (
                      <Image
                        src={imgUrl}
                        alt={studio.name}
                        fill
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized={isExternalImageUrl(imgUrl)}
                        onError={() => handleImageError(studio.id)}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-semibold text-text-heading transition-colors group-hover:text-brand-primary">
                      {studio.name}
                    </h3>
                    {studio.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-text-muted">
                        {studio.description}
                      </p>
                    )}
                    <div className="mt-auto flex items-center gap-4 border-t border-border-light/60 pt-4">
                      {studio.capacity && (
                        <span className="flex items-center gap-1 text-sm text-text-muted">
                          <Users className="h-3.5 w-3.5" />
                          {studio.capacity}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-sm font-semibold text-brand-primary">
                        <Clock className="h-3.5 w-3.5" />
                        {studio.hourlyRate > 0
                          ? `${studio.hourlyRate.toLocaleString()} SAR/${t('home.studiosPerHour')}`
                          : '—'}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Button
            variant="outline"
            className="rounded-xl border-brand-primary px-8 text-brand-primary transition-all hover:bg-brand-primary hover:text-white"
            asChild
          >
            <Link href="/studios">
              {t('common.viewAll')}
              <ArrowRight className="ms-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </PublicContainer>
    </section>
  )
}
