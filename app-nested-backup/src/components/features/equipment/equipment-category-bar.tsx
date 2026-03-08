/**
 * Compact equipment category bar: primary row (All + parents) and optional
 * subcategory row. Used on the equipment catalog page for fast category navigation.
 */

'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { cn } from '@/lib/utils'
import { getCategoryIcon } from '@/lib/utils/category-icons'
import { LayoutGrid } from 'lucide-react'

export interface EquipmentCategoryBarCategory {
  id: string
  name: string
  slug: string
  parentId: string | null
}

interface EquipmentCategoryBarProps {
  categories: EquipmentCategoryBarCategory[]
  currentCategoryId: string
}

export function EquipmentCategoryBar({ categories, currentCategoryId }: EquipmentCategoryBarProps) {
  const { t } = useLocale()
  const parents = useMemo(() => categories.filter((c) => !c.parentId), [categories])

  const { currentParentId, subcategories } = useMemo(() => {
    if (!currentCategoryId) return { currentParentId: null, subcategories: [] }
    const current = categories.find((c) => c.id === currentCategoryId)
    if (!current) return { currentParentId: null, subcategories: [] }
    const parentId = current.parentId ?? current.id
    const children = categories.filter((c) => c.parentId === parentId)
    return { currentParentId: parentId, subcategories: children }
  }, [categories, currentCategoryId])

  const showSubcategories = subcategories.length > 0

  return (
    <nav
      className="sticky top-16 z-30 -mx-4 flex flex-col gap-1.5 border-b border-border-light/50 bg-white/95 px-4 py-2 shadow-sm backdrop-blur sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 lg:top-16"
      aria-label="Equipment categories"
    >
      {/* Row 1: All + parent categories */}
      <div className="overflow-x-auto pb-0.5">
        <div className="flex min-w-0 gap-2">
          <Link
            href="/equipment"
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
              !currentCategoryId
                ? 'border-brand-primary bg-brand-primary text-white'
                : 'border-border-light/60 bg-surface-light text-text-body hover:border-brand-primary/30 hover:bg-brand-primary/10 hover:text-brand-primary'
            )}
            aria-current={!currentCategoryId ? 'true' : undefined}
          >
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                !currentCategoryId ? 'bg-white/20' : 'bg-brand-primary/10 text-brand-primary'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="whitespace-nowrap">{t('common.viewAll')}</span>
          </Link>
          {parents.map((cat) => {
            const Icon = getCategoryIcon(cat.slug)
            const isActive = currentCategoryId === cat.id
            return (
              <Link
                key={cat.id}
                href={`/equipment?categoryId=${cat.id}`}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-brand-primary bg-brand-primary text-white'
                    : 'border-border-light/60 bg-surface-light text-text-body hover:border-brand-primary/30 hover:bg-brand-primary/10 hover:text-brand-primary'
                )}
                aria-current={isActive ? 'true' : undefined}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                    isActive ? 'bg-white/20' : 'bg-brand-primary/10 text-brand-primary'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="whitespace-nowrap">{cat.name}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Row 2: Subcategories – always directly under parent row, follows its position */}
      <div className="min-h-[30px] overflow-x-auto">
        <div className="flex min-w-0 items-center gap-1.5">
          {showSubcategories ? (
            subcategories.map((cat) => {
              const isActive = currentCategoryId === cat.id
              return (
                <Link
                  key={cat.id}
                  href={`/equipment?categoryId=${cat.id}`}
                  className={cn(
                    'shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-border-light/50 bg-white text-text-muted hover:border-brand-primary/20 hover:bg-brand-primary/5 hover:text-brand-primary'
                  )}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span className="whitespace-nowrap">{cat.name}</span>
                </Link>
              )
            })
          ) : (
            <span className="text-xs text-text-muted" role="status">
              {currentCategoryId
                ? (t('equipment.noSubcategories') ?? 'No subcategories')
                : (t('equipment.selectCategoryForSubcategories') ??
                  'Select a category above to see subcategories')}
            </span>
          )}
        </div>
      </div>
    </nav>
  )
}
