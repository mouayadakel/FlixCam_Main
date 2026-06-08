/**
 * Filter sidebar for equipment catalog – collapsible accordion sections,
 * active filter chips, mobile sheet drawer, modern rounded styling.
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { MultiSelectCheckbox } from '@/components/ui/multi-select-checkbox'
import { useCallback, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Search, SlidersHorizontal, X, ArrowDownUp, Tag } from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'recommended', labelKey: 'equipment.sortRecommended' },
  { value: 'price_asc', labelKey: 'equipment.sortPriceAsc' },
  { value: 'price_desc', labelKey: 'equipment.sortPriceDesc' },
  { value: 'newest', labelKey: 'equipment.sortNewest' },
] as const

// Price and rental-date filtering are intentionally hidden in the public catalog UI.

interface Brand {
  id: string
  name: string
  slug: string
}

interface Category {
  id: string
  name: string
  slug: string
}

interface FilterPanelProps {
  categories: Category[]
  brands: Brand[]
  total: number
  className?: string
}

/** The actual filter content, reused inside desktop sidebar and mobile drawer */
function FilterContent({
  categories,
  brands,
  total,
  t,
  // State
  localQ,
  setLocalQ,
  sort,
  categoryId,
  brandIds,
  brandOptions,
  hasFilters,
  activeChips,
  // Handlers
  handleSearchSubmit,
  handleSortChange,
  handleCategoryChange,
  handleBrandToggle,
  removeChip,
  clearAll,
}: {
  categories: Category[]
  brands: Brand[]
  total: number
  t: (key: string) => string
  localQ: string
  setLocalQ: (v: string) => void
  sort: string
  categoryId: string
  brandIds: string[]
  brandOptions: { id: string; label: string }[]
  hasFilters: boolean
  activeChips: { key: string; label: string }[]
  handleSearchSubmit: (e: React.FormEvent) => void
  handleSortChange: (v: string) => void
  handleCategoryChange: (v: string) => void
  handleBrandToggle: (id: string, checked: boolean) => void
  removeChip: (key: string) => void
  clearAll: () => void
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-brand-primary" />
          <span className="text-sm font-semibold text-text-heading">{t('common.filter')}</span>
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-auto p-0 text-xs font-medium text-brand-primary hover:bg-transparent hover:text-brand-primary-hover"
          >
            <X className="me-1 h-3 w-3" />
            {t('common.clear')}
          </Button>
        )}
      </div>

      {/* Results count */}
      <div className="rounded-xl bg-surface-light px-3 py-2">
        <p className="text-sm text-text-muted">
          <span className="font-semibold text-text-heading">{total}</span>{' '}
          {t('common.productsCount') ?? 'items'}
        </p>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => removeChip(chip.key)}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-primary/10 px-2.5 py-1 text-xs font-medium text-brand-primary transition-colors hover:bg-brand-primary/20"
            >
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearchSubmit}>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            type="search"
            placeholder={t('common.search')}
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            className="w-full rounded-xl border-border-light bg-surface-light pe-20 ps-9 focus-visible:ring-brand-primary/20"
          />
          <button
            type="submit"
            className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-brand-primary px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            {t('common.search')}
          </button>
        </div>
      </form>

      {/* Collapsible filter sections */}
      <Accordion
        type="multiple"
        defaultValue={['category', 'sort', 'brands']}
        className="space-y-1"
      >
        {/* Category */}
        <AccordionItem value="category" className="border-b-0">
          <AccordionTrigger className="px-0 py-3 text-xs font-medium uppercase tracking-wider text-text-muted hover:text-text-heading hover:no-underline">
            {t('equipment.category')}
          </AccordionTrigger>
          <AccordionContent className="pb-3 pt-0">
            <Select
              value={categoryId || 'all'}
              onValueChange={(v) => handleCategoryChange(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-full rounded-xl border-border-light bg-surface-light">
                <SelectValue placeholder={t('common.filter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.viewAll')}</SelectItem>
                {categories.map((c) => (
                    <SelectItem key={c.id} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>

        {/* Sort */}
        <AccordionItem value="sort" className="border-b-0">
          <AccordionTrigger className="px-0 py-3 text-xs font-medium uppercase tracking-wider text-text-muted hover:text-text-heading hover:no-underline">
            <span className="flex items-center gap-1.5">
              <ArrowDownUp className="h-3.5 w-3.5" />
              {t('equipment.sortBy') ?? 'Sort by'}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-3 pt-0">
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full rounded-xl border-border-light bg-surface-light">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.labelKey) ?? opt.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>

        {/* Brands */}
        {brandOptions.length > 0 && (
          <AccordionItem value="brands" className="border-b-0">
            <AccordionTrigger className="px-0 py-3 text-xs font-medium uppercase tracking-wider text-text-muted hover:text-text-heading hover:no-underline">
              <span className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                {t('equipment.brands') ?? 'Brands'}
                {brandIds.length > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-primary px-1 text-[9px] font-bold text-white">
                    {brandIds.length}
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3 pt-0">
              <MultiSelectCheckbox
                label={undefined}
                options={brandOptions}
                selectedIds={brandIds}
                onToggle={handleBrandToggle}
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  )
}

export function FilterPanel({ categories, brands, total, className }: FilterPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLocale()

  const q = searchParams?.get('q') ?? ''
  const sort = searchParams?.get('sort') ?? 'recommended'
  const categoryId = searchParams?.get('categoryId') ?? ''
  const brandIdsParam = searchParams?.get('brandIds') ?? ''
  const brandIds = useMemo(
    () =>
      brandIdsParam
        ? brandIdsParam
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    [brandIdsParam]
  )

  const [localQ, setLocalQ] = useState(q)
  const [mobileOpen, setMobileOpen] = useState(false)

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams?.toString() ?? '')
      for (const [key, value] of Object.entries(updates)) {
        if (value != null && value !== '') next.set(key, value)
        else next.delete(key)
      }
      next.delete('skip')
      router.push(`/equipment?${next.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams({ q: localQ.trim() || undefined })
  }

  const handleSortChange = (value: string) => {
    updateParams({ sort: value === 'recommended' ? undefined : value })
  }

  const handleCategoryChange = (value: string) => {
    // `categoryId` in URL represents a Category slug (API supports slug or id, but UI uses slug)
    updateParams({ categoryId: value || undefined })
  }

  const handleBrandToggle = (id: string, checked: boolean) => {
    const next = checked ? [...brandIds, id] : brandIds.filter((b) => b !== id)
    updateParams({ brandIds: next.length ? next.join(',') : undefined })
  }

  const clearAll = () => {
    setLocalQ('')
    router.push('/equipment', { scroll: false })
  }

  const hasFilters =
    !!q ||
    !!categoryId ||
    sort !== 'recommended' ||
    brandIds.length > 0

  const brandOptions = useMemo(() => brands.map((b) => ({ id: b.id, label: b.name })), [brands])

  // Build active filter chips
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = []
    if (q) chips.push({ key: 'q', label: `"${q}"` })
    if (categoryId) {
      const cat = categories.find((c) => c.slug === categoryId)
      if (cat) chips.push({ key: 'category', label: cat.name })
    }
    if (sort !== 'recommended') {
      const opt = SORT_OPTIONS.find((o) => o.value === sort)
      chips.push({ key: 'sort', label: t(opt?.labelKey ?? '') ?? sort })
    }
    for (const bid of brandIds) {
      const brand = brands.find((b) => b.id === bid)
      if (brand) chips.push({ key: `brand:${bid}`, label: brand.name })
    }
    return chips
  }, [q, categoryId, sort, brandIds, categories, brands, t])

  const removeChip = useCallback(
    (key: string) => {
      if (key === 'q') {
        setLocalQ('')
        updateParams({ q: undefined })
      } else if (key === 'category') updateParams({ categoryId: undefined })
      else if (key === 'sort') updateParams({ sort: undefined })
      else if (key.startsWith('brand:')) {
        const bid = key.replace('brand:', '')
        const next = brandIds.filter((b) => b !== bid)
        updateParams({ brandIds: next.length ? next.join(',') : undefined })
      }
    },
    [updateParams, brandIds]
  )

  const filterContentProps = {
    categories,
    brands,
    total,
    t,
    localQ,
    setLocalQ,
    sort,
    categoryId,
    brandIds,
    brandOptions,
    hasFilters,
    activeChips,
    handleSearchSubmit,
    handleSortChange,
    handleCategoryChange,
    handleBrandToggle,
    removeChip,
    clearAll,
  }

  const filterCount = activeChips.length

  return (
    <>
      {/* Mobile filter trigger */}
      <div className="mb-4 lg:hidden">
        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="min-h-[44px] w-full justify-between rounded-xl border-border-light active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                {filterCount > 0
                  ? `${t('common.filter')} (${filterCount})`
                  : `${t('common.filter')} & ${t('equipment.sortBy') ?? 'Sort'}`}
              </span>
              {filterCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-primary px-1.5 text-[10px] font-bold text-white">
                  {filterCount}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent
            className="max-h-[85vh] overflow-y-auto sm:max-w-[400px]"
            aria-describedby={undefined}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-brand-primary" />
                {t('common.filter')}
              </DialogTitle>
            </DialogHeader>
            <div className="pt-2">
              <FilterContent {...filterContentProps} />
            </div>
            <div className="sticky bottom-0 mt-3 border-t border-border-light bg-white pt-3">
              <Button
                className="w-full rounded-xl bg-brand-primary font-semibold hover:bg-brand-primary-hover"
                onClick={() => setMobileOpen(false)}
              >
                {t('equipment.showResults').replace('{count}', String(total))}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden rounded-2xl border border-border-light/60 bg-white p-5 shadow-card lg:block',
          'lg:sticky lg:top-24 lg:self-start',
          className
        )}
      >
        <FilterContent {...filterContentProps} />
      </aside>
    </>
  )
}
