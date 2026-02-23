'use client'

import { useState, useMemo } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { StudioCard } from '@/components/features/studio/studio-card'
import {
  Search,
  SlidersHorizontal,
  Building2,
  Sparkles,
  MapPin,
  Users,
  DollarSign,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface StudioItem {
  id: string
  name: string
  slug: string
  description: string | null
  capacity: number | null
  hourlyRate: number
  areaSqm: number | null
  studioType: string | null
  bestUse: string | null
  availabilityConfidence: string | null
  hasElectricity: boolean
  hasAC: boolean
  hasChangingRooms: boolean
  address: string | null
  media: { url: string; type: string }[]
}

type SortOption = 'name' | 'price-asc' | 'price-desc' | 'capacity'

const PRICE_RANGES = [
  { label: 'الكل', value: 'all', min: 0, max: Infinity },
  { label: 'أقل من 200 ر.س', value: '0-200', min: 0, max: 200 },
  { label: '200 – 500 ر.س', value: '200-500', min: 200, max: 500 },
  { label: '500 – 1000 ر.س', value: '500-1000', min: 500, max: 1000 },
  { label: 'أكثر من 1000 ر.س', value: '1000+', min: 1000, max: Infinity },
]

const CAPACITY_RANGES = [
  { label: 'الكل', value: 'all', min: 0, max: Infinity },
  { label: '1 – 5 أشخاص', value: '1-5', min: 1, max: 5 },
  { label: '6 – 15 شخص', value: '6-15', min: 6, max: 15 },
  { label: '16 – 30 شخص', value: '16-30', min: 16, max: 30 },
  { label: 'أكثر من 30', value: '30+', min: 31, max: Infinity },
]

export function StudiosListClient({ studios }: { studios: StudioItem[] }) {
  const { t } = useLocale()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [priceRange, setPriceRange] = useState<string>('all')
  const [capacityRange, setCapacityRange] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [sort, setSort] = useState<SortOption>('name')
  const [showFilters, setShowFilters] = useState(false)

  const studioTypes = useMemo(() => {
    const types = new Set(studios.map((s) => s.studioType).filter(Boolean) as string[])
    return Array.from(types).sort()
  }, [studios])

  const locations = useMemo(() => {
    const locs = new Set(
      studios
        .map((s) => s.address)
        .filter(Boolean)
        .map((a) => {
          const parts = a!.split('،').map((p) => p.trim())
          return parts.length > 1 ? parts[parts.length - 1] : parts[0]
        })
    )
    return Array.from(locs).sort()
  }, [studios])

  const activeFilterCount = [
    typeFilter !== 'all',
    priceRange !== 'all',
    capacityRange !== 'all',
    locationFilter !== 'all',
  ].filter(Boolean).length

  const clearFilters = () => {
    setTypeFilter('all')
    setPriceRange('all')
    setCapacityRange('all')
    setLocationFilter('all')
    setSearch('')
  }

  const filtered = useMemo(() => {
    let result = studios

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.address?.toLowerCase().includes(q) ||
          s.bestUse?.toLowerCase().includes(q)
      )
    }

    if (typeFilter !== 'all') {
      result = result.filter((s) => s.studioType === typeFilter)
    }

    if (priceRange !== 'all') {
      const range = PRICE_RANGES.find((r) => r.value === priceRange)
      if (range) {
        result = result.filter((s) => s.hourlyRate >= range.min && s.hourlyRate < range.max)
      }
    }

    if (capacityRange !== 'all') {
      const range = CAPACITY_RANGES.find((r) => r.value === capacityRange)
      if (range) {
        result = result.filter((s) => {
          const cap = s.capacity ?? 0
          return cap >= range.min && cap <= range.max
        })
      }
    }

    if (locationFilter !== 'all') {
      result = result.filter((s) => s.address?.includes(locationFilter))
    }

    switch (sort) {
      case 'price-asc':
        result = [...result].sort((a, b) => a.hourlyRate - b.hourlyRate)
        break
      case 'price-desc':
        result = [...result].sort((a, b) => b.hourlyRate - a.hourlyRate)
        break
      case 'capacity':
        result = [...result].sort((a, b) => (b.capacity ?? 0) - (a.capacity ?? 0))
        break
      default:
        break
    }

    return result
  }, [studios, search, typeFilter, priceRange, capacityRange, locationFilter, sort])

  return (
    <div className="space-y-8" dir="rtl">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden rounded-2xl bg-hero-gradient px-6 py-10 text-white sm:px-10 sm:py-14 md:py-16">
        <div className="absolute inset-0 bg-card-shine opacity-50" />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <Building2 className="h-4 w-4" />
            {t('nav.studios')}
          </div>
          <h1 className="mb-3 text-hero-title text-white">{t('nav.studios')}</h1>
          <p className="text-body-main text-white/85">{t('studios.heroSubtitle')}</p>
          <div className="mt-6 flex items-center gap-3 sm:justify-center">
            <Badge className="border-white/20 bg-white/15 text-white backdrop-blur-sm">
              <Sparkles className="mr-1 h-3 w-3" />
              {studios.length} {t('studios.studiosAvailable')}
            </Badge>
          </div>
        </div>
      </section>

      {/* ── Search & Filter Bar ── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('studios.searchPlaceholder')}
              className="w-full rounded-xl border border-input bg-background py-2.5 pe-4 ps-10 text-sm shadow-card transition-shadow focus:shadow-card-elevated focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className="gap-2 rounded-xl"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t('studios.filters')}
              {activeFilterCount > 0 && (
                <Badge className="h-5 w-5 justify-center rounded-full bg-primary p-0 text-[10px] text-white">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              aria-label="ترتيب حسب"
              className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm shadow-card"
            >
              <option value="name">{t('studios.sortName')}</option>
              <option value="price-asc">{t('studios.sortPriceAsc')}</option>
              <option value="price-desc">{t('studios.sortPriceDesc')}</option>
              <option value="capacity">{t('studios.sortCapacity')}</option>
            </select>
          </div>
        </div>

        {/* ── Expanded Filters Panel ── */}
        {showFilters && (
          <div className="animate-fade-in rounded-xl border border-border-light/60 bg-white p-4 shadow-card">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {studioTypes.length > 0 && (
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                    <Building2 className="h-3.5 w-3.5" />
                    {t('studios.filterType')}
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    aria-label="فلترة حسب النوع"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">{t('studios.filterAllTypes')}</option>
                    {studioTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                  <DollarSign className="h-3.5 w-3.5" />
                  {t('studios.filterPriceRange')}
                </label>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  aria-label="فلترة حسب السعر"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  {PRICE_RANGES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                  <Users className="h-3.5 w-3.5" />
                  {t('studios.filterCapacity')}
                </label>
                <select
                  value={capacityRange}
                  onChange={(e) => setCapacityRange(e.target.value)}
                  aria-label="فلترة حسب السعة"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  {CAPACITY_RANGES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              {locations.length > 0 && (
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    {t('studios.filterLocation')}
                  </label>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    aria-label="فلترة حسب الموقع"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">{t('studios.filterAllLocations')}</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {activeFilterCount > 0 && (
              <div className="mt-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1.5 text-xs text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                  {t('studios.clearFilters')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Results Count ── */}
      {search.trim() || activeFilterCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? t('studios.result') : t('studios.results')}
          {search.trim() && <span> — &ldquo;{search}&rdquo;</span>}
        </p>
      ) : null}

      {/* ── Grid ── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((studio, i) => (
            <div
              key={studio.id}
              className="animate-fade-in opacity-0"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
            >
              <StudioCard studio={studio} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-foreground">{t('common.noResults')}</h3>
          <p className="max-w-sm text-sm text-muted-foreground">{t('studios.noResultsHint')}</p>
        </div>
      )}
    </div>
  )
}
