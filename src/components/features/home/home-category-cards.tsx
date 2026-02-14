/**
 * Homepage category cards section – visually rich grid of categories with icons,
 * hover effects (scale + shadow lift), and equipment count.
 */

'use client'

import Link from 'next/link'
import { Camera, Lightbulb, Mic2, Film, Video, Monitor, Clapperboard, Aperture } from 'lucide-react'
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
}

function getIcon(slug: string) {
  const key = slug.toLowerCase()
  for (const [k, Icon] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return Icon
  }
  return Film
}

export function HomeCategoryCards({ categories }: HomeCategoryCardsProps) {
  const { t } = useLocale()

  if (!categories.length) return null

  return (
    <section className="bg-white py-16 md:py-20 lg:py-24">
      <PublicContainer>
        <div className="mb-10 text-center">
          <h2 className="text-section-title text-text-heading">
            {t('home.categoriesTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-body-main text-text-body">
            {t('home.heroSubtitle')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-5">
          {categories.map((cat, index) => {
            const Icon = getIcon(cat.slug)
            return (
              <Link
                key={cat.id}
                href={`/equipment?categoryId=${cat.id}`}
                className="group flex flex-col items-center gap-4 rounded-2xl border border-border-light/80 bg-white p-6 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:border-brand-primary/20 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${0.05 * index}s` }}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary/10 to-brand-primary/5 text-brand-primary transition-all duration-300 group-hover:bg-brand-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-primary/20 group-hover:scale-110">
                  <Icon className="h-7 w-7" />
                </div>
                <div>
                  <span className="font-semibold text-text-heading group-hover:text-brand-primary transition-colors">
                    {cat.name}
                  </span>
                  <span className="mt-1 block text-sm text-text-muted">
                    {cat.equipmentCount} {t('common.productsCount').toLowerCase()}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </PublicContainer>
    </section>
  )
}
