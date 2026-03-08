/**
 * Sticky category tabs for equipment browse. Shows category name and selected count.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { cn } from '@/lib/utils'
import type { CategoryStepConfig } from '@/lib/stores/kit-wizard.store'

interface CategoryTabBarProps {
  categories: CategoryStepConfig[]
  activeCategoryId: string | null
  onSelect: (categoryId: string) => void
  selectedCountByCategory?: Record<string, number>
  className?: string
}

export function CategoryTabBar({
  categories,
  activeCategoryId,
  onSelect,
  selectedCountByCategory = {},
  className,
}: CategoryTabBarProps) {
  const { t } = useLocale()

  if (categories.length === 0) return null

  return (
    <div
      className={cn(
        'sticky top-14 z-20 -mx-4 border-b border-border-light bg-white/95 px-4 py-3 backdrop-blur sm:top-16 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8',
        className
      )}
      role="tablist"
      aria-label={t('kit.stepCategory')}
    >
      <div className="flex gap-1 overflow-x-auto pb-1">
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.categoryId
          const count = selectedCountByCategory[cat.categoryId] ?? 0
          return (
            <button
              key={cat.categoryId}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`${cat.categoryName}${count > 0 ? `, ${count} selected` : ''}`}
              onClick={() => onSelect(cat.categoryId)}
              className={cn(
                'shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-primary text-white'
                  : 'bg-surface-light text-text-muted hover:bg-border-light hover:text-text-heading'
              )}
            >
              <span className="whitespace-nowrap">{cat.stepTitle || cat.categoryName}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'ms-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                    isActive ? 'bg-white/20' : 'bg-brand-primary/15 text-brand-primary'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
