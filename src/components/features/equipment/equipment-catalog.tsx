/**
 * Equipment catalog: filter panel (sticky sidebar), grid, pagination.
 * Clean layout with proper spacing and modern pagination.
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { EquipmentCategoryBar } from './equipment-category-bar'
import { FilterPanel } from './filter-panel'
import { EquipmentGrid } from './equipment-grid'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { EquipmentCardItem } from './equipment-card'

const PAGE_SIZE = 24

export function EquipmentCatalog() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useLocale()
  const [equipment, setEquipment] = useState<EquipmentCardItem[]>([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<
    { id: string; name: string; slug: string; parentId?: string | null }[]
  >([])
  const [brands, setBrands] = useState<{ id: string; name: string; slug: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const skip = Math.max(0, parseInt(searchParams?.get('skip') ?? '0', 10))
  const categoryId = searchParams?.get('categoryId') ?? ''
  const brandId = searchParams?.get('brandId') ?? ''
  const brandIds = searchParams?.get('brandIds') ?? ''
  const q = searchParams?.get('q') ?? ''
  const sort = searchParams?.get('sort') ?? ''
  const priceMin = searchParams?.get('priceMin') ?? ''
  const priceMax = searchParams?.get('priceMax') ?? ''

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = []
    if (q) chips.push({ key: 'q', label: `"${q}"` })
    if (categoryId) {
      const cat = categories.find((c) => c.id === categoryId)
      if (cat) chips.push({ key: 'categoryId', label: cat.name })
    }
    if (sort && sort !== 'recommended') chips.push({ key: 'sort', label: sort })
    if (priceMin) chips.push({ key: 'priceMin', label: `Min ${priceMin}` })
    if (priceMax) chips.push({ key: 'priceMax', label: `Max ${priceMax}` })
    brandIds.split(',').forEach((bid) => {
      const b = brands.find((x) => x.id === bid.trim())
      if (b) chips.push({ key: `brand:${b.id}`, label: b.name })
    })
    return chips
  }, [q, categoryId, sort, priceMin, priceMax, brandIds, categories, brands])

  const removeChip = (key: string) => {
    const next = new URLSearchParams(searchParams?.toString() ?? '')
    if (key === 'q') next.delete('q')
    else if (key === 'categoryId') next.delete('categoryId')
    else if (key === 'sort') next.delete('sort')
    else if (key === 'priceMin') next.delete('priceMin')
    else if (key === 'priceMax') next.delete('priceMax')
    else if (key.startsWith('brand:')) {
      const bid = key.replace('brand:', '')
      const rest = brandIds
        .split(',')
        .map((s) => s.trim())
        .filter((id) => id !== bid)
      if (rest.length) next.set('brandIds', rest.join(','))
      else next.delete('brandIds')
    }
    next.delete('skip')
    router.push(`/equipment?${next.toString()}`, { scroll: false })
  }

  useEffect(() => {
    const params = new URLSearchParams()
    if (categoryId) params.set('categoryId', categoryId)
    if (brandIds) params.set('brandIds', brandIds)
    else if (brandId) params.set('brandId', brandId)
    if (q) params.set('q', q)
    if (sort) params.set('sort', sort)
    if (priceMin) params.set('priceMin', priceMin)
    if (priceMax) params.set('priceMax', priceMax)
    params.set('skip', String(skip))
    params.set('take', String(PAGE_SIZE))

    setIsLoading(true)
    setError(null)

    Promise.all([
      fetch(`/api/public/equipment?${params.toString()}`).then((r) => r.json()),
      fetch('/api/public/categories').then((r) => r.json()),
      fetch('/api/public/brands').then((r) => r.json()),
    ])
      .then(([equipRes, catRes, brandRes]) => {
        if (equipRes.error) throw new Error(equipRes.error)
        setEquipment(Array.isArray(equipRes.data) ? equipRes.data : [])
        setTotal(equipRes.total ?? 0)
        setCategories(Array.isArray(catRes?.data) ? catRes.data : [])
        setBrands(Array.isArray(brandRes?.data) ? brandRes.data : [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('common.error')))
      .finally(() => setIsLoading(false))
  }, [skip, categoryId, brandId, brandIds, q, sort, priceMin, priceMax, t])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1
  const hasPrev = skip > 0
  const hasNext = skip + PAGE_SIZE < total

  return (
    <div className="flex flex-col gap-6">
      {categories.length > 0 && (
        <EquipmentCategoryBar
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            parentId: c.parentId ?? null,
          }))}
          currentCategoryId={categoryId}
        />
      )}
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="sticky top-[72px] z-30 w-full shrink-0 lg:relative lg:top-0 lg:z-0 lg:w-72">
          <FilterPanel categories={categories} brands={brands} total={total} />
        </div>
        <div className="min-w-0 flex-1 space-y-6">
          {activeChips.length > 0 && (
            <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-1">
              {activeChips.map((chip) => (
                <span
                  key={chip.key}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm"
                >
                  <span className="max-w-[120px] truncate">{chip.label}</span>
                  <button
                    type="button"
                    onClick={() => removeChip(chip.key)}
                    className="min-h-[24px] min-w-[24px] rounded-full p-0.5 hover:bg-muted"
                    aria-label={t('common.remove') ?? 'Remove'}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              <Link
                href="/equipment"
                className="shrink-0 text-sm font-medium text-primary hover:underline"
              >
                {t('common.clearAll') ?? 'Clear all'}
              </Link>
            </div>
          )}
          {q && (
            <p className="text-body-main text-text-muted">
              {t('common.resultsFor').replace('{query}', q)}
            </p>
          )}

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
              {error}
              <Button
                variant="link"
                className="ms-2 text-destructive"
                onClick={() => window.location.reload()}
              >
                {t('common.retry')}
              </Button>
            </div>
          )}

          {!error && (
            <>
              <EquipmentGrid items={equipment} isLoading={isLoading} />

              {!isLoading && equipment.length === 0 && (
                <div className="py-16 text-center text-muted-foreground">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-light">
                    <span className="text-3xl">🔍</span>
                  </div>
                  <p className="text-lg font-medium text-text-heading">{t('common.noResults')}</p>
                  <p className="mt-1 text-sm text-text-muted">{t('equipment.adjustFilters')}</p>
                  <Button
                    variant="outline"
                    asChild
                    className="mt-4 rounded-xl border-brand-primary/20 text-brand-primary hover:bg-brand-primary/5"
                  >
                    <Link href="/equipment">{t('common.viewAll')}</Link>
                  </Button>
                </div>
              )}

              {totalPages > 1 && !isLoading && (
                <nav
                  className="flex flex-col items-center gap-4 pt-6 sm:flex-row sm:justify-center sm:gap-2"
                  aria-label="Pagination"
                >
                  {/* Mobile: Load more only */}
                  {hasNext && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="min-h-[44px] w-full rounded-xl sm:w-auto lg:hidden"
                    >
                      <Link
                        href={`/equipment?${new URLSearchParams({
                          ...Object.fromEntries(searchParams?.entries() ?? []),
                          skip: String(skip + PAGE_SIZE),
                        }).toString()}`}
                      >
                        {t('common.loadMore') ?? 'Load more'}
                      </Link>
                    </Button>
                  )}
                  {/* Desktop: full pagination */}
                  <div className="hidden items-center justify-center gap-2 lg:flex">
                    {hasPrev && (
                      <Button variant="outline" size="sm" asChild className="rounded-xl">
                        <Link
                          href={`/equipment?${new URLSearchParams({
                            ...Object.fromEntries(searchParams?.entries() ?? []),
                            skip: String(Math.max(0, skip - PAGE_SIZE)),
                          }).toString()}`}
                        >
                          <ChevronLeft className="me-1 h-4 w-4" />
                          {t('common.back')}
                        </Link>
                      </Button>
                    )}
                    <span className="rounded-xl bg-surface-light px-4 py-2 text-sm font-medium text-text-heading">
                      {currentPage} / {totalPages}
                    </span>
                    {hasNext && (
                      <Button variant="outline" size="sm" asChild className="rounded-xl">
                        <Link
                          href={`/equipment?${new URLSearchParams({
                            ...Object.fromEntries(searchParams?.entries() ?? []),
                            skip: String(skip + PAGE_SIZE),
                          }).toString()}`}
                        >
                          {t('common.next')}
                          <ChevronRight className="ms-1 h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
