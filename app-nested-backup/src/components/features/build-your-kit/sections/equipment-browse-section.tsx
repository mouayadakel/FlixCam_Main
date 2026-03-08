/**
 * Equipment grid with category tabs, filters, and infinite scroll.
 */

'use client'

import { useMemo } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { useKitWizardStore, getSelectedByCategory } from '@/lib/stores/kit-wizard.store'
import { CategoryTabBar } from '../category-tab-bar'
import { InfiniteEquipmentGrid } from '../infinite-equipment-grid'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Zap, Star, Crown } from 'lucide-react'
import type { BudgetTier } from '@/lib/stores/kit-wizard.store'

const BUDGET_TIERS: { id: BudgetTier; labelKey: string; Icon: typeof Zap }[] = [
  { id: 'ESSENTIAL', labelKey: 'kit.budgetEssential', Icon: Zap },
  { id: 'PROFESSIONAL', labelKey: 'kit.budgetProfessional', Icon: Star },
  { id: 'PREMIUM', labelKey: 'kit.budgetPremium', Icon: Crown },
]

export function EquipmentBrowseSection() {
  const { t } = useLocale()
  const categorySteps = useKitWizardStore((s) => s.categorySteps)
  const activeCategory = useKitWizardStore((s) => s.activeCategory)
  const setActiveCategory = useKitWizardStore((s) => s.setActiveCategory)
  const searchQuery = useKitWizardStore((s) => s.searchQuery)
  const setSearchQuery = useKitWizardStore((s) => s.setSearchQuery)
  const sortBy = useKitWizardStore((s) => s.sortBy)
  const setSortBy = useKitWizardStore((s) => s.setSortBy)
  const budgetTier = useKitWizardStore((s) => s.budgetTier)
  const setBudgetTier = useKitWizardStore((s) => s.setBudgetTier)
  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)
  const view = useKitWizardStore((s) => s.view)
  const shootTypeData = useKitWizardStore((s) => s.shootTypeData)

  const recommendedIds = useMemo(() => {
    const recs = shootTypeData?.recommendations
    if (!Array.isArray(recs)) return []
    return (recs as { equipmentId?: string }[])
      .map((r) => r.equipmentId)
      .filter((id): id is string => Boolean(id))
  }, [shootTypeData?.recommendations])

  const byCategory = getSelectedByCategory({ selectedEquipment })
  const selectedCountByCategory: Record<string, number> = {}
  byCategory.forEach((entries, catId) => {
    selectedCountByCategory[catId] = entries.length
  })

  const effectiveCategory = activeCategory || categorySteps[0]?.categoryId || null

  if (view !== 'building') return null
  if (categorySteps.length === 0) return null

  return (
    <section id="equipment-browse" className="animate-fade-in space-y-4">
      <CategoryTabBar
        categories={categorySteps}
        activeCategoryId={effectiveCategory}
        onSelect={setActiveCategory}
        selectedCountByCategory={selectedCountByCategory}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder={t('common.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
          aria-label={t('common.search')}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className={cn(
            'rounded-lg border border-border-light bg-white px-3 py-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-brand-primary/20'
          )}
          aria-label="Sort"
        >
          <option value="recommended">{t('kit.recommendedFor')}</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="newest">Newest</option>
        </select>
        <div className="flex gap-1 rounded-lg border border-border-light bg-surface-light p-1">
          {BUDGET_TIERS.map(({ id, labelKey, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setBudgetTier(id)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                budgetTier === id
                  ? 'bg-brand-primary text-white'
                  : 'text-text-muted hover:bg-white hover:text-text-heading'
              )}
              aria-pressed={budgetTier === id}
            >
              <Icon className="h-4 w-4" />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      <InfiniteEquipmentGrid
        categoryId={effectiveCategory}
        budgetTier={budgetTier}
        searchQuery={searchQuery}
        sortBy={sortBy}
        recommendedIds={recommendedIds}
      />
    </section>
  )
}
