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
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { PriceRangeSlider } from '@/components/ui/price-range-slider'
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

const DEFAULT_PRICE_MIN = 0
const DEFAULT_PRICE_MAX = 100000

function getDefaultDates(): { start: string; end: string } {
  const start = new Date()
  start.setDate(start.getDate() + 1)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

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
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  startDate,
  endDate,
  brandIds,
  brandOptions,
  hasFilters,
  activeChips,
  // Handlers
  handleSearchSubmit,
  handleSortChange,
  handleCategoryChange,
  handlePriceApply,
  handleStartDateChange,
  handleEndDateChange,
  handleBrandToggle,
  removeChip,
  clearAll,
  defaultDates,
}: {
  categories: Category[]
  brands: Brand[]
  total: number
  t: (key: string) => string
  localQ: string
  setLocalQ: (v: string) => void
  sort: string
  categoryId: string
  priceMin: number
  setPriceMin: (v: number) => void
  priceMax: number
  setPriceMax: (v: number) => void
  startDate: string
  endDate: string
  brandIds: string[]
  brandOptions: { id: string; label: string }[]
  hasFilters: boolean
  activeChips: { key: string; label: string }[]
  handleSearchSubmit: (e: React.FormEvent) => void
  handleSortChange: (v: string) => void
  handleCategoryChange: (v: string) => void
  handlePriceApply: () => void
  handleStartDateChange: (v: string) => void
  handleEndDateChange: (v: string) => void
  handleBrandToggle: (id: string, checked: boolean) => void
  removeChip: (key: string) => void
  clearAll: () => void
  defaultDates: { start: string; end: string }
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
            className="h-auto p-0 text-xs font-medium text-brand-primary hover:text-brand-primary-hover hover:bg-transparent"
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
            className="w-full ps-9 pe-20 rounded-xl border-border-light bg-surface-light focus-visible:ring-brand-primary/20"
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
      <Accordion type="multiple" defaultValue={['category', 'sort', 'dates', 'price', 'brands']} className="space-y-1">
        {/* Category */}
        <AccordionItem value="category" className="border-b-0">
          <AccordionTrigger className="py-3 px-0 text-xs font-medium uppercase tracking-wider text-text-muted hover:text-text-heading hover:no-underline">
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
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>

        {/* Sort */}
        <AccordionItem value="sort" className="border-b-0">
          <AccordionTrigger className="py-3 px-0 text-xs font-medium uppercase tracking-wider text-text-muted hover:text-text-heading hover:no-underline">
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

        {/* Dates */}
        <AccordionItem value="dates" className="border-b-0">
          <AccordionTrigger className="py-3 px-0 text-xs font-medium uppercase tracking-wider text-text-muted hover:text-text-heading hover:no-underline">
            Rental dates
          </AccordionTrigger>
          <AccordionContent className="pb-3 pt-0">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={handleStartDateChange}
              onEndDateChange={handleEndDateChange}
              startLabel={t('checkout.startDate')}
              endLabel={t('checkout.endDate')}
              minStart={defaultDates.start}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Price */}
        <AccordionItem value="price" className="border-b-0">
          <AccordionTrigger className="py-3 px-0 text-xs font-medium uppercase tracking-wider text-text-muted hover:text-text-heading hover:no-underline">
            Price range
          </AccordionTrigger>
          <AccordionContent className="pb-3 pt-0 space-y-3">
            <PriceRangeSlider
              min={priceMin}
              max={priceMax}
              onMinChange={setPriceMin}
              onMaxChange={setPriceMax}
              absoluteMin={DEFAULT_PRICE_MIN}
              absoluteMax={DEFAULT_PRICE_MAX}
              label={t('equipment.pricePerDay') ?? 'Price per day (SAR)'}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl border-brand-primary/20 text-brand-primary hover:bg-brand-primary/5"
              onClick={handlePriceApply}
            >
              {t('common.apply') ?? 'Apply'}
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Brands */}
        {brandOptions.length > 0 && (
          <AccordionItem value="brands" className="border-b-0">
            <AccordionTrigger className="py-3 px-0 text-xs font-medium uppercase tracking-wider text-text-muted hover:text-text-heading hover:no-underline">
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
  const defaultDates = useMemo(getDefaultDates, [])

  const q = searchParams?.get('q') ?? ''
  const sort = searchParams?.get('sort') ?? 'recommended'
  const categoryId = searchParams?.get('categoryId') ?? ''
  const priceMinParam = searchParams?.get('priceMin')
  const priceMaxParam = searchParams?.get('priceMax')
  const startDateParam = searchParams?.get('startDate') ?? defaultDates.start
  const endDateParam = searchParams?.get('endDate') ?? defaultDates.end
  const brandIdsParam = searchParams?.get('brandIds') ?? ''
  const brandIds = useMemo(
    () => brandIdsParam ? brandIdsParam.split(',').map((s) => s.trim()).filter(Boolean) : [],
    [brandIdsParam]
  )

  const [localQ, setLocalQ] = useState(q)
  const [priceMin, setPriceMin] = useState(
    priceMinParam ? parseInt(priceMinParam, 10) : DEFAULT_PRICE_MIN
  )
  const [priceMax, setPriceMax] = useState(
    priceMaxParam ? parseInt(priceMaxParam, 10) : DEFAULT_PRICE_MAX
  )
  const [startDate, setStartDate] = useState(startDateParam)
  const [endDate, setEndDate] = useState(endDateParam)
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
    updateParams({ categoryId: value || undefined })
  }

  const handlePriceApply = () => {
    updateParams({
      priceMin: priceMin > DEFAULT_PRICE_MIN ? String(priceMin) : undefined,
      priceMax: priceMax < DEFAULT_PRICE_MAX ? String(priceMax) : undefined,
    })
  }

  const handleStartDateChange = (start: string) => {
    setStartDate(start)
    updateParams({ startDate: start, endDate })
  }
  const handleEndDateChange = (end: string) => {
    setEndDate(end)
    updateParams({ startDate, endDate: end })
  }

  const handleBrandToggle = (id: string, checked: boolean) => {
    const next = checked ? [...brandIds, id] : brandIds.filter((b) => b !== id)
    updateParams({ brandIds: next.length ? next.join(',') : undefined })
  }

  const clearAll = () => {
    setLocalQ('')
    setPriceMin(DEFAULT_PRICE_MIN)
    setPriceMax(DEFAULT_PRICE_MAX)
    setStartDate(defaultDates.start)
    setEndDate(defaultDates.end)
    router.push('/equipment', { scroll: false })
  }

  const hasFilters =
    !!q ||
    !!categoryId ||
    sort !== 'recommended' ||
    (priceMinParam && parseInt(priceMinParam, 10) > DEFAULT_PRICE_MIN) ||
    (priceMaxParam && parseInt(priceMaxParam, 10) < DEFAULT_PRICE_MAX) ||
    brandIds.length > 0

  const brandOptions = useMemo(
    () => brands.map((b) => ({ id: b.id, label: b.name })),
    [brands]
  )

  // Build active filter chips
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = []
    if (q) chips.push({ key: 'q', label: `"${q}"` })
    if (categoryId) {
      const cat = categories.find((c) => c.id === categoryId)
      if (cat) chips.push({ key: 'category', label: cat.name })
    }
    if (sort !== 'recommended') {
      const opt = SORT_OPTIONS.find((o) => o.value === sort)
      chips.push({ key: 'sort', label: t(opt?.labelKey ?? '') ?? sort })
    }
    if (priceMinParam && parseInt(priceMinParam, 10) > DEFAULT_PRICE_MIN)
      chips.push({ key: 'priceMin', label: `Min: ${priceMinParam} SAR` })
    if (priceMaxParam && parseInt(priceMaxParam, 10) < DEFAULT_PRICE_MAX)
      chips.push({ key: 'priceMax', label: `Max: ${priceMaxParam} SAR` })
    for (const bid of brandIds) {
      const brand = brands.find((b) => b.id === bid)
      if (brand) chips.push({ key: `brand:${bid}`, label: brand.name })
    }
    return chips
  }, [q, categoryId, sort, priceMinParam, priceMaxParam, brandIds, categories, brands, t])

  const removeChip = useCallback(
    (key: string) => {
      if (key === 'q') { setLocalQ(''); updateParams({ q: undefined }) }
      else if (key === 'category') updateParams({ categoryId: undefined })
      else if (key === 'sort') updateParams({ sort: undefined })
      else if (key === 'priceMin') { setPriceMin(DEFAULT_PRICE_MIN); updateParams({ priceMin: undefined }) }
      else if (key === 'priceMax') { setPriceMax(DEFAULT_PRICE_MAX); updateParams({ priceMax: undefined }) }
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
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    startDate,
    endDate,
    brandIds,
    brandOptions,
    hasFilters,
    activeChips,
    handleSearchSubmit,
    handleSortChange,
    handleCategoryChange,
    handlePriceApply,
    handleStartDateChange,
    handleEndDateChange,
    handleBrandToggle,
    removeChip,
    clearAll,
    defaultDates,
  }

  const filterCount = activeChips.length

  return (
    <>
      {/* Mobile filter trigger */}
      <div className="lg:hidden mb-4">
        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full rounded-xl border-border-light justify-between"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                {t('common.filter')}
              </span>
              {filterCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-primary px-1.5 text-[10px] font-bold text-white">
                  {filterCount}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[400px]" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-brand-primary" />
                {t('common.filter')}
              </DialogTitle>
            </DialogHeader>
            <div className="pt-2">
              <FilterContent {...filterContentProps} />
            </div>
            <div className="sticky bottom-0 border-t border-border-light bg-white pt-3 mt-3">
              <Button
                className="w-full rounded-xl bg-brand-primary hover:bg-brand-primary-hover font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                Show {total} results
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:block rounded-2xl border border-border-light/60 bg-white p-5 shadow-card',
          'lg:sticky lg:top-24 lg:self-start',
          className
        )}
      >
        <FilterContent {...filterContentProps} />
      </aside>
    </>
  )
}
