/**
 * Homepage category cards section – visually rich grid of categories with icons,
 * hover effects (scale + shadow lift), and equipment count.
 */

'use client'

import Link from 'next/link'
import {
  Camera,
  Lightbulb,
  Mic2,
  Film,
  Video,
  Monitor,
  Clapperboard,
  Aperture,
  ArrowRight,
  Users,
} from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  camera: Camera,
  cameras: Camera,
  lens: Aperture,
  lenses: Aperture,
  lighting: Lightbulb,
  light: Lightbulb,
  audio: Mic2,
  sound: Mic2,
  grip: Film,
  crew: Users,
  film: Film,
  video: Video,
  monitor: Monitor,
  production: Clapperboard,
}

export interface HomeCategoryCardsProps {
  categories: Array<{
    id: string
    name: string
    slug: string
    equipmentCount: number
  }>
  showProductCount?: boolean
  compactMode?: 'compact' | 'comfortable'
}

function getIcon(slug: string) {
  const key = slug.toLowerCase()
  for (const [k, Icon] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return Icon
  }
  return Film
}

export function HomeCategoryCards({
  categories,
  showProductCount = false,
  compactMode = 'compact',
}: HomeCategoryCardsProps) {
  const { t } = useLocale()
  const isCompact = compactMode === 'compact'

  return (
    <section className="bg-white py-10 md:py-16">
      <PublicContainer>
        <div className="mb-[0.8rem] text-center">
          <h2 className="text-section-title text-text-heading">{t('home.categoriesTitle')}</h2>
          <p className="mx-auto mt-3 max-w-lg text-body-main text-text-body">
            {t('home.categoriesSubtitle')}
          </p>
        </div>

        {categories.length === 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-5 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-4 rounded-2xl border border-border-light/60 bg-surface-light/30 p-6 text-center"
                >
                  <div className="h-16 w-16 animate-pulse rounded-2xl bg-border-light/60" />
                  <div className="space-y-2">
                    <div className="mx-auto h-4 w-20 animate-pulse rounded-md bg-border-light/60" />
                    <div className="mx-auto h-3 w-14 animate-pulse rounded-md bg-border-light/40" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <p className="mb-3 text-sm text-text-muted">{t('home.categoriesEmptyMessage')}</p>
              <Link
                href="/equipment"
                className="inline-flex items-center gap-1 font-semibold text-brand-primary transition-colors hover:text-brand-primary-hover"
              >
                {t('home.categoriesEmptyCta')}
                <ArrowRight className="ms-1 h-4 w-4" />
              </Link>
            </div>
          </>
        ) : (
          <div
            className={
              isCompact
                ? 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-3 lg:grid-cols-5'
                : 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-5 lg:grid-cols-5'
            }
          >
            {categories.map((cat, index) => {
              const Icon = getIcon(cat.slug)
              return (
                <Link
                  key={cat.id}
                  href={`/equipment?categoryId=${cat.slug}`}
                  className={
                    isCompact
                      ? 'group flex min-h-[44px] min-w-[44px] animate-fade-in-up flex-col items-center justify-center gap-2 rounded-xl border border-border-light/80 bg-white px-3 py-[0.6rem] text-center opacity-0 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary/20 hover:shadow-card-hover active:scale-95'
                      : 'group flex min-h-[44px] min-w-[44px] animate-fade-in-up flex-col items-center justify-center gap-4 rounded-2xl border border-border-light/80 bg-white p-4 text-center opacity-0 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary/20 hover:shadow-card-hover active:scale-95 md:p-6'
                  }
                  style={{ animationDelay: `${0.05 * index}s` }}
                >
                  <div
                    className={
                      isCompact
                        ? 'flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary/10 to-brand-primary/5 text-brand-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-primary/20'
                        : 'flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary/10 to-brand-primary/5 text-brand-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-primary/20'
                    }
                  >
                    <Icon className={isCompact ? 'h-5 w-5' : 'h-7 w-7'} />
                  </div>
                  <div className="leading-tight">
                    <span className="text-[14px] font-semibold text-text-heading transition-colors group-hover:text-brand-primary">
                      {cat.name}
                    </span>
                    {showProductCount && (
                      <span className="mt-1 block text-[14px] text-text-muted">
                        {cat.equipmentCount} {t('common.productsCount')}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </PublicContainer>
    </section>
  )
}
