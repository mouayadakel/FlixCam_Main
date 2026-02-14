/**
 * Kit wizard step 1: Choose category. Grid of category cards with equipment count.
 */

'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { useKitWizardStore } from '@/lib/stores/kit-wizard.store'
import { Button } from '@/components/ui/button'
import { CategorySkeleton } from '../kit-skeleton'
import { cn } from '@/lib/utils'
import { FolderOpen } from 'lucide-react'

interface CategoryItem {
  id: string
  name: string
  slug: string
  equipmentCount: number
}

export function StepCategory() {
  const { t } = useLocale()
  const selectedCategoryId = useKitWizardStore((s) => s.selectedCategoryId)
  const setCategory = useKitWizardStore((s) => s.setCategory)

  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/api/public/categories')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((json) => {
        const data = Array.isArray(json?.data) ? json.data : []
        setCategories(
          data.map((c: { id: string; name: string; slug: string; equipmentCount?: number }) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            equipmentCount: c.equipmentCount ?? 0,
          }))
        )
      })
      .catch(() => setError(t('kit.errorLoading')))
      .finally(() => setLoading(false))
  }, [t])

  if (loading) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-section-title text-text-heading mb-1">
          {t('kit.chooseCategory')}
        </h2>
        <p className="text-body-main text-text-muted mb-6">{t('kit.chooseCategoryDesc')}</p>
        <CategorySkeleton count={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-section-title text-text-heading mb-1">
          {t('kit.chooseCategory')}
        </h2>
        <p className="text-body-main text-text-muted mb-6">{t('kit.chooseCategoryDesc')}</p>
        <div className="rounded-xl border border-border-light bg-surface-light p-8 text-center">
          <p className="text-text-body text-destructive mb-4">{error}</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            {t('common.retry')}
          </Button>
        </div>
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-section-title text-text-heading mb-1">
          {t('kit.chooseCategory')}
        </h2>
        <p className="text-body-main text-text-muted mb-6">{t('kit.chooseCategoryDesc')}</p>
        <div className="flex flex-col items-center justify-center rounded-xl border border-border-light bg-surface-light p-12">
          <FolderOpen className="h-12 w-12 text-text-muted mb-4" />
          <p className="text-text-body text-text-muted">{t('kit.noCategories')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-section-title text-text-heading mb-1">
        {t('kit.chooseCategory')}
      </h2>
      <p className="text-body-main text-text-muted mb-6">{t('kit.chooseCategoryDesc')}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={cn(
              'flex flex-col items-start rounded-2xl border bg-white p-4 text-start shadow-card transition-all duration-300',
              'hover:shadow-card-hover hover:border-brand-primary/20',
              selectedCategoryId === cat.id
                ? 'border-brand-primary ring-2 ring-brand-primary ring-offset-2 bg-brand-primary/5'
                : 'border-border-light/60'
            )}
          >
            <span className="font-semibold text-text-heading">{cat.name}</span>
            <span className="mt-1 text-sm text-text-muted">
              {cat.equipmentCount} {t('kit.items')}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
