/**
 * Equipment catalog: filters, grid, pagination (Phase 2.2).
 */

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { EquipmentFilters } from './equipment-filters'
import { EquipmentGrid } from './equipment-grid'
import { Button } from '@/components/ui/button'
import type { EquipmentCardItem } from './equipment-card'

const PAGE_SIZE = 24

export function EquipmentCatalog() {
  const searchParams = useSearchParams()
  const { t } = useLocale()
  const [equipment, setEquipment] = useState<EquipmentCardItem[]>([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([])
  const [brands, setBrands] = useState<{ id: string; name: string; slug: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const skip = Math.max(0, parseInt(searchParams.get('skip') ?? '0', 10))
  const categoryId = searchParams.get('categoryId') ?? ''
  const brandId = searchParams.get('brandId') ?? ''

  useEffect(() => {
    const params = new URLSearchParams()
    if (categoryId) params.set('categoryId', categoryId)
    if (brandId) params.set('brandId', brandId)
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
  }, [skip, categoryId, brandId, t])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1
  const hasPrev = skip > 0
  const hasNext = skip + PAGE_SIZE < total

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <EquipmentFilters categories={categories} brands={brands} />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
          {error}
          <Button variant="link" className="ms-2" onClick={() => window.location.reload()}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {!error && (
        <>
          <EquipmentGrid items={equipment} isLoading={isLoading} />

          {!isLoading && equipment.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>{t('common.noResults')}</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/equipment">{t('common.viewAll')}</Link>
              </Button>
            </div>
          )}

          {totalPages > 1 && !isLoading && (
            <nav className="flex items-center justify-center gap-2 pt-4" aria-label="Pagination">
              {hasPrev && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/equipment?${new URLSearchParams({
                      ...Object.fromEntries(searchParams.entries()),
                      skip: String(Math.max(0, skip - PAGE_SIZE)),
                    }).toString()}`}
                  >
                    {t('common.back')}
                  </Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground px-2">
                {currentPage} / {totalPages}
              </span>
              {hasNext && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/equipment?${new URLSearchParams({
                      ...Object.fromEntries(searchParams.entries()),
                      skip: String(skip + PAGE_SIZE),
                    }).toString()}`}
                  >
                    {t('common.next')}
                  </Link>
                </Button>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  )
}
