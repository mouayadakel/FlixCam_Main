/**
 * Studio booking panel: sticky card with date, time, duration, packages, add-ons, CTA
 */

'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StudioSlotPicker } from './studio-slot-picker'
import {
  CalendarDays,
  Clock,
  Package,
  Plus,
  ShoppingCart,
  Info,
  Search,
  Tag,
  Sparkles,
} from 'lucide-react'
import type { StudioPublicData } from '@/lib/types/studio.types'
import { trackStudioEvent } from '@/lib/analytics'

interface StudioBookingPanelProps {
  studio: StudioPublicData
  controlledPackageId?: string | null
  onChangePackage?: (id: string | null) => void
  controlledDate?: string
  onDateChange?: (date: string) => void
}

const DURATION_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]

const CATEGORY_LABELS: Record<string, string> = {
  equipment: 'معدات',
  lighting: 'إضاءة',
  props: 'ديكور',
  crew: 'طاقم',
  catering: 'ضيافة',
  other: 'أخرى',
}

export function StudioBookingPanel({
  studio,
  controlledPackageId,
  onChangePackage,
  controlledDate,
  onDateChange: onDateChangeProp,
}: StudioBookingPanelProps) {
  const { t } = useLocale()
  const [internalDate, setInternalDate] = useState('')

  const date = controlledDate ?? internalDate
  const setDate = (d: string) => {
    setInternalDate(d)
    onDateChangeProp?.(d)
  }
  const [slot, setSlot] = useState<{ start: string; end: string } | null>(null)
  const prevDateRef = useRef(controlledDate)
  useEffect(() => {
    if (controlledDate && controlledDate !== prevDateRef.current) {
      setSlot(null)
    }
    prevDateRef.current = controlledDate
  }, [controlledDate])
  const [durationHours, setDurationHours] = useState(studio.minHours || 1)
  const [internalPackageId, setInternalPackageId] = useState<string | null>(null)
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<Set<string>>(new Set())
  const [addOnSearch, setAddOnSearch] = useState('')
  const [couponCode, setCouponCode] = useState('')

  const isControlled = controlledPackageId !== undefined
  const selectedPackageId = isControlled ? controlledPackageId : internalPackageId
  const setSelectedPackageId =
    isControlled && onChangePackage ? onChangePackage : setInternalPackageId

  const packages = studio.packages ?? []
  const addOns = studio.addOns ?? []

  const selectedPkg = packages.find((p) => p.id === selectedPackageId) ?? null

  useEffect(() => {
    if (selectedPkg?.hours != null) {
      setDurationHours(selectedPkg.hours)
    }
  }, [selectedPackageId, selectedPkg?.hours])

  // Filter add-ons by search
  const filteredAddOns = useMemo(() => {
    if (!addOnSearch.trim()) return addOns
    const q = addOnSearch.toLowerCase()
    return addOns.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        (a.category && CATEGORY_LABELS[a.category]?.toLowerCase().includes(q))
    )
  }, [addOns, addOnSearch])

  // Group add-ons by category
  const groupedAddOns = useMemo(() => {
    const groups: Record<string, typeof filteredAddOns> = {}
    for (const addon of filteredAddOns) {
      const key = addon.category || 'other'
      if (!groups[key]) groups[key] = []
      groups[key].push(addon)
    }
    return groups
  }, [filteredAddOns])

  // Discount calculation
  const hasDiscount = studio.discountActive && studio.discountPercent && studio.discountPercent > 0
  const discountMultiplier = hasDiscount ? (100 - (studio.discountPercent ?? 0)) / 100 : 1

  const basePrice = selectedPkg ? selectedPkg.price : studio.hourlyRate * durationHours
  const discountedBase = Math.round(basePrice * discountMultiplier)
  const addOnsTotal = addOns
    .filter((a) => selectedAddOnIds.has(a.id))
    .reduce((sum, a) => sum + a.price, 0)
  const total = discountedBase + addOnsTotal
  const savings = hasDiscount ? basePrice - discountedBase : 0

  const canAdd = date && slot && durationHours >= (studio.minHours || 1)

  const toggleAddOn = (id: string) => {
    setSelectedAddOnIds((prev) => {
      const next = new Set(prev)
      const wasSelected = next.has(id)
      if (wasSelected) next.delete(id)
      else next.add(id)
      const addon = addOns.find((a) => a.id === id)
      trackStudioEvent('addon_toggled', {
        studio_slug: studio.slug,
        addon_id: id,
        addon_name: addon?.name ?? '',
        action: wasSelected ? 'removed' : 'added',
      })
      return next
    })
  }

  const cartParams = new URLSearchParams()
  cartParams.set('studio', studio.slug)
  cartParams.set('date', date)
  if (slot) {
    cartParams.set('start', slot.start)
    cartParams.set('duration', String(durationHours))
  }
  if (selectedPackageId) cartParams.set('package', selectedPackageId)
  selectedAddOnIds.forEach((id) => cartParams.append('addOn', id))
  if (couponCode.trim()) cartParams.set('coupon', couponCode.trim())

  const bufferNote =
    studio.setupBuffer > 0 || studio.cleaningBuffer > 0
      ? t('studios.bufferNote').replace(
          '{minutes}',
          String(studio.setupBuffer + studio.cleaningBuffer)
        )
      : null

  return (
    <div
      id="booking-panel"
      className="space-y-5 rounded-2xl border border-border-light/40 bg-white p-5 shadow-card-elevated lg:sticky lg:top-24"
      dir="rtl"
    >
      {/* Discount Banner */}
      {hasDiscount && (
        <div className="-mx-5 -mt-5 animate-fade-in overflow-hidden rounded-t-2xl bg-gradient-to-l from-primary via-primary/90 to-primary/80 px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-white/90" />
              <span className="text-sm font-bold text-white">خصم {studio.discountPercent}%</span>
            </div>
            <Badge className="border-white/30 bg-white/20 text-[10px] text-white">
              <Tag className="me-1 h-3 w-3" />
              عرض محدود
            </Badge>
          </div>
          {studio.discountMessage && (
            <p className="mt-1 text-xs text-white/80">{studio.discountMessage}</p>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-text-heading">
          <CalendarDays className="h-5 w-5 text-primary" />
          {t('studios.booking')}
        </h3>
        {studio.hourlyRate > 0 && (
          <div className="text-end">
            {hasDiscount && (
              <span className="me-1.5 text-sm text-text-muted line-through">
                {Number(studio.hourlyRate).toLocaleString()}
              </span>
            )}
            <span className="text-price-tag text-primary">
              {hasDiscount
                ? Math.round(Number(studio.hourlyRate) * discountMultiplier).toLocaleString()
                : Number(studio.hourlyRate).toLocaleString()}
            </span>
            <span className="ms-1 text-xs text-text-muted">ر.س / ساعة</span>
          </div>
        )}
      </div>

      <div className="h-px bg-border-light/60" />

      <StudioSlotPicker
        studioSlug={studio.slug}
        selectedDate={date}
        selectedSlot={slot}
        onDateChange={setDate}
        onSlotSelect={setSlot}
      />

      {!selectedPkg && slot && (
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-text-heading">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {t('studios.durationHours')}
          </label>
          <select
            value={durationHours}
            onChange={(e) => setDurationHours(parseInt(e.target.value, 10))}
            aria-label="Duration"
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm transition-shadow focus:shadow-card-elevated focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {DURATION_OPTIONS.filter((h) => h >= (studio.minHours || 1)).map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? t('studios.hour') : t('studios.hours')}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Package summary (controlled) or radio list (uncontrolled) */}
      {packages.length > 0 && isControlled ? (
        <div className="rounded-xl bg-surface-light p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-text-heading">
                {selectedPkg ? selectedPkg.nameAr || selectedPkg.name : t('studios.hourlyOption')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('package-section')
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t('studios.changePackage')}
            </button>
          </div>
          {selectedPkg && (
            <p className="mt-1 text-xs text-text-muted">
              {Number(selectedPkg.price).toLocaleString()} ر.س
              {selectedPkg.hours != null
                ? ` · ${selectedPkg.hours} ${selectedPkg.hours === 1 ? t('studios.hour') : t('studios.hours')}`
                : ''}
            </p>
          )}
        </div>
      ) : packages.length > 0 ? (
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-text-heading">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            {t('studios.packages')}
          </label>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-transparent bg-surface-light p-3 text-sm transition-all hover:border-primary/20 has-[:checked]:border-primary has-[:checked]:bg-primary-50">
              <input
                type="radio"
                name="package"
                checked={!selectedPackageId}
                onChange={() => setSelectedPackageId(null)}
                className="accent-primary"
              />
              <span className="font-medium">
                {t('studios.hourlyRateLabel').replace('{rate}', String(studio.hourlyRate))}
              </span>
            </label>
            {packages.map((pkg) => (
              <label
                key={pkg.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-transparent bg-surface-light p-3 text-sm transition-all hover:border-primary/20 has-[:checked]:border-primary has-[:checked]:bg-primary-50"
              >
                <input
                  type="radio"
                  name="package"
                  checked={selectedPackageId === pkg.id}
                  onChange={() => setSelectedPackageId(pkg.id)}
                  className="mt-0.5 accent-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{pkg.nameAr || pkg.name}</span>
                    <div className="flex items-center gap-1.5">
                      {pkg.originalPrice != null && pkg.originalPrice > pkg.price && (
                        <span className="text-xs text-text-muted line-through">
                          {pkg.originalPrice} ر.س
                        </span>
                      )}
                      <span className="font-semibold text-primary">{pkg.price} ر.س</span>
                    </div>
                  </div>
                  {pkg.hours != null && (
                    <span className="text-xs text-text-muted">
                      {pkg.hours} {pkg.hours === 1 ? t('studios.hour') : t('studios.hours')}
                    </span>
                  )}
                  {pkg.discountPercent != null && pkg.discountPercent > 0 && (
                    <Badge className="mt-1 border-success-500/30 bg-success-50 text-[10px] text-success-700">
                      خصم {pkg.discountPercent}%
                    </Badge>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {/* Add-ons with search */}
      {addOns.length > 0 && (
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-text-heading">
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            {t('studios.addons')}
            <span className="text-xs font-normal text-text-muted">({addOns.length})</span>
          </label>

          {/* Search bar for add-ons */}
          {addOns.length > 3 && (
            <div className="relative mb-2">
              <Search className="absolute end-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث في الإضافات..."
                value={addOnSearch}
                onChange={(e) => setAddOnSearch(e.target.value)}
                className="w-full rounded-xl border border-input bg-background py-2 pe-3 pe-9 ps-3 text-sm transition-shadow placeholder:text-muted-foreground focus:shadow-card-elevated focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="بحث في الإضافات"
                dir="rtl"
              />
            </div>
          )}

          <div className="max-h-64 space-y-3 overflow-y-auto">
            {Object.entries(groupedAddOns).map(([cat, items]) => (
              <div key={cat}>
                {Object.keys(groupedAddOns).length > 1 && (
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    {CATEGORY_LABELS[cat] || cat}
                  </p>
                )}
                <div className="space-y-1.5">
                  {items.map((addOn) => {
                    const hasSale = addOn.originalPrice != null && addOn.originalPrice > addOn.price
                    const isSelected = selectedAddOnIds.has(addOn.id)
                    return (
                      <label
                        key={addOn.id}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 p-3 text-sm transition-all ${
                          isSelected
                            ? 'border-primary bg-primary-50'
                            : 'border-transparent bg-surface-light hover:border-primary/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAddOn(addOn.id)}
                            className="accent-primary"
                          />
                          <div>
                            <span className="font-medium">{addOn.name}</span>
                            {addOn.description && (
                              <p className="text-[11px] text-text-muted">{addOn.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end">
                          {hasSale && (
                            <span className="text-[10px] text-text-muted line-through">
                              {addOn.originalPrice} ر.س
                            </span>
                          )}
                          <span
                            className={`text-xs font-semibold ${hasSale ? 'text-success-700' : 'text-primary'}`}
                          >
                            {addOn.price} ر.س
                          </span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
            {filteredAddOns.length === 0 && addOnSearch && (
              <p className="py-3 text-center text-xs text-text-muted">لا توجد إضافات مطابقة</p>
            )}
          </div>

          {selectedAddOnIds.size > 0 && (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-primary-50 px-3 py-1.5 text-xs">
              <span className="text-text-body">{selectedAddOnIds.size} إضافات مختارة</span>
              <span className="font-semibold text-primary">+{addOnsTotal} ر.س</span>
            </div>
          )}
        </div>
      )}

      {bufferNote && (
        <div className="flex items-start gap-2 rounded-xl bg-warning-50 p-3 text-xs text-warning-700">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {bufferNote}
        </div>
      )}

      {/* Total */}
      <div className="rounded-xl bg-surface-light p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-body">{t('studios.total')}</span>
          <div className="text-end">
            {hasDiscount && savings > 0 && (
              <p className="text-xs text-text-muted line-through">
                {(basePrice + addOnsTotal).toLocaleString()} ر.س
              </p>
            )}
            <span className="text-xl font-bold text-text-heading">
              {total.toLocaleString()} ر.س
            </span>
            {studio.vatIncluded && (
              <p className="text-[10px] text-text-muted">{t('studios.vatIncluded')}</p>
            )}
          </div>
        </div>
        {hasDiscount && savings > 0 && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-success-50 px-3 py-1.5">
            <Tag className="h-3 w-3 text-success-700" />
            <span className="text-xs font-medium text-success-700">
              وفرت {savings.toLocaleString()} ر.س!
            </span>
          </div>
        )}
      </div>

      {/* Coupon code */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Tag className="absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder={t('studios.couponPlaceholder')}
            className="w-full rounded-xl border border-border-light/60 bg-surface-light py-2.5 pe-3 ps-9 text-sm placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            dir="ltr"
          />
        </div>
      </div>

      <Button
        asChild
        size="lg"
        disabled={!canAdd}
        className="w-full rounded-xl text-base shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.98]"
        onClick={() => {
          if (canAdd) {
            trackStudioEvent('booking_started', {
              studio_slug: studio.slug,
              package_id: selectedPackageId,
              package_name: selectedPkg ? selectedPkg.nameAr || selectedPkg.name : 'hourly',
              addons_count: selectedAddOnIds.size,
              total,
            })
          }
        }}
      >
        <Link
          href={canAdd ? `/cart?${cartParams.toString()}` : '#'}
          className="inline-flex items-center justify-center gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          {t('common.addToCart')}
        </Link>
      </Button>

      {studio.bookingDisclaimer && (
        <p className="text-center text-[11px] leading-relaxed text-text-muted">
          {studio.bookingDisclaimer}
        </p>
      )}
    </div>
  )
}
