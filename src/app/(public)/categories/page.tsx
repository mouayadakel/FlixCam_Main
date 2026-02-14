/**
 * Categories index – modern grid of category cards with matched icons,
 * breadcrumb, page hero, entrance animations, and equipment counts.
 */

import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { PublicContainer } from '@/components/public/public-container'
import {
  Camera,
  Lightbulb,
  Mic2,
  Film,
  Video,
  Monitor,
  Clapperboard,
  Aperture,
  Speaker,
  Grip,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react'

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  camera: Camera,
  cameras: Camera,
  lens: Aperture,
  lenses: Aperture,
  lighting: Lightbulb,
  light: Lightbulb,
  lights: Lightbulb,
  audio: Mic2,
  sound: Mic2,
  microphone: Mic2,
  grip: Grip,
  film: Film,
  video: Video,
  monitor: Monitor,
  monitors: Monitor,
  production: Clapperboard,
  speaker: Speaker,
  speakers: Speaker,
}

function getIcon(slug: string) {
  const key = slug.toLowerCase()
  for (const [k, Icon] of Object.entries(CATEGORY_ICON_MAP)) {
    if (key.includes(k)) return Icon
  }
  return Film
}

async function getCategories() {
  return unstable_cache(
    async () => {
      const list = await prisma.category.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { equipment: true } },
        },
        orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      })
      return list.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        equipmentCount: c._count.equipment,
      }))
    },
    ['public-categories-index'],
    { revalidate: 300 }
  )()
}

export default async function CategoriesPage() {
  const categories = await getCategories()
  const totalItems = categories.reduce((sum, c) => sum + c.equipmentCount, 0)

  return (
    <main>
      {/* Hero header */}
      <div className="bg-surface-light border-b border-border-light/50">
        <PublicContainer>
          <div className="py-10 md:py-14">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-text-muted">
              <Link href="/" className="transition-colors hover:text-text-heading">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-medium text-text-heading">Categories</span>
            </nav>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/10">
                <LayoutGrid className="h-6 w-6 text-brand-primary" />
              </div>
              <div>
                <h1 className="text-section-title text-text-heading">
                  Browse by Category
                </h1>
                <p className="mt-1 text-body-main text-text-body">
                  {categories.length} categories &middot; {totalItems} items available
                </p>
              </div>
            </div>
          </div>
        </PublicContainer>
      </div>

      {/* Category grid */}
      <PublicContainer>
        <div className="py-10 md:py-14">
          {categories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {categories.map((cat, index) => {
                const Icon = getIcon(cat.slug)
                return (
                  <Link
                    key={cat.id}
                    href={`/equipment?categoryId=${cat.id}`}
                    className="group flex flex-col rounded-2xl border border-border-light/60 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:border-brand-primary/20"
                    style={{ animationDelay: `${0.04 * index}s` }}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary/10 to-brand-primary/5 text-brand-primary transition-all duration-300 group-hover:bg-brand-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-primary/20 group-hover:scale-110">
                      <Icon className="h-7 w-7" aria-hidden />
                    </div>
                    <h2 className="mt-4 text-base font-semibold text-text-heading group-hover:text-brand-primary transition-colors">
                      {cat.name}
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                      <span className="font-semibold text-text-body">{cat.equipmentCount}</span>{' '}
                      {cat.equipmentCount === 1 ? 'item' : 'items'}
                    </p>
                    <div className="mt-4 flex items-center gap-1 text-sm font-medium text-brand-primary opacity-0 translate-x-[-4px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                      Browse
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-light">
                <LayoutGrid className="h-8 w-8 text-text-muted/40" />
              </div>
              <p className="text-lg font-medium text-text-heading">No categories yet</p>
              <p className="mt-1 text-sm text-text-muted">Categories will appear here once equipment is added.</p>
            </div>
          )}
        </div>
      </PublicContainer>
    </main>
  )
}
