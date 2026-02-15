/**
 * Step: Shoot type selection. Large cinematic cards from GET /api/public/shoot-types.
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { useKitWizardStore } from '@/lib/stores/kit-wizard.store'
import { cn } from '@/lib/utils'
import { Check, Loader2 } from 'lucide-react'

interface ShootTypeItem {
  id: string
  name: string
  slug: string
  description: string | null
  nameAr: string | null
  icon: string | null
  coverImageUrl: string | null
  categoryCount: number
  recommendationCount: number
}

export function StepShootType() {
  const { t } = useLocale()
  const shootTypeId = useKitWizardStore((s) => s.shootTypeId)
  const setShootType = useKitWizardStore((s) => s.setShootType)
  const [list, setList] = useState<ShootTypeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageFailedIds, setImageFailedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/public/shoot-types')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((json) => {
        setList(Array.isArray(json?.data) ? json.data : [])
      })
      .catch(() => setError(t('kit.errorLoading')))
      .finally(() => setLoading(false))
  }, [t])

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border-light bg-surface-light p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <button
          type="button"
          className="text-sm text-brand-primary underline"
          onClick={() => window.location.reload()}
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-section-title text-text-heading mb-1">
        {t('kit.chooseShootType')}
      </h2>
      <p className="text-body-main text-text-muted mb-6">
        {t('kit.chooseShootTypeDesc')}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((st) => (
          <button
            key={st.id}
            type="button"
            onClick={() => setShootType(st.id, st.slug)}
            className={cn(
              'group relative overflow-hidden rounded-2xl border bg-white text-start shadow-card transition-all hover:shadow-card-hover',
              shootTypeId === st.id
                ? 'border-brand-primary ring-2 ring-brand-primary ring-offset-2'
                : 'border-border-light/60'
            )}
          >
            <div className="relative aspect-[4/3] bg-muted">
              {st.coverImageUrl && !imageFailedIds.has(st.id) ? (
                <Image
                  src={st.coverImageUrl}
                  alt={st.name}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  unoptimized={st.coverImageUrl.startsWith('/images/')}
                  onError={() => setImageFailedIds((prev) => new Set(prev).add(st.id))}
                />
              ) : null}
              <div
                className={cn(
                  'flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/80 text-4xl text-muted-foreground',
                  st.coverImageUrl && !imageFailedIds.has(st.id) && 'hidden'
                )}
              >
                {st.icon || '🎬'}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="font-semibold">{st.name}</h3>
                {st.description && (
                  <p className="mt-1 text-sm text-white/90 line-clamp-2">{st.description}</p>
                )}
                <p className="mt-2 text-xs text-white/80">
                  {st.categoryCount} {t('kit.stepCategory')} · {st.recommendationCount}+ {t('kit.items')}
                </p>
              </div>
              {shootTypeId === st.id && (
                <div className="absolute top-3 end-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-white">
                  <Check className="h-5 w-5" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
