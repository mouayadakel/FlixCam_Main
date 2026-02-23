/**
 * Equipment detail page – premium layout with breadcrumb, gallery left,
 * sticky booking sidebar right, modern tabs, recommendations grid.
 */

'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { BottomSheet } from '@/components/mobile/bottom-sheet'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EquipmentGallery } from './equipment-gallery'
import { EquipmentPriceBlock } from './equipment-price-block'
import { EquipmentCard } from './equipment-card'
import { useCartStore } from '@/lib/stores/cart.store'
import { AvailabilityBadge, getAvailabilityStatus } from './availability-badge'
import { AvailabilityPreview } from './availability-preview'
import { SaveEquipmentButton } from './save-equipment-button'
import { SpecificationsDisplay, QuickSpecPills } from './specifications-display'
import { FrequentlyRentedTogether } from './frequently-rented-together'
import { WhatsAppRentButton } from './whatsapp-rent-button'
import type { EquipmentCardItem } from './equipment-card'
import type { AnySpecifications } from '@/lib/types/specifications.types'
import { isStructuredSpecifications } from '@/lib/types/specifications.types'
import {
  ChevronRight,
  ShoppingCart,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
} from 'lucide-react'

function getDefaultDates(): { start: string; end: string } {
  const start = new Date()
  start.setDate(start.getDate() + 1)
  const end = new Date(start)
  end.setDate(end.getDate() + 3)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

interface EquipmentDetailProps {
  equipment: {
    id: string
    sku: string
    model: string | null
    dailyPrice: number
    weeklyPrice: number | null
    monthlyPrice: number | null
    quantityAvailable: number | null
    category: { name: string; slug: string } | null
    brand: { name: string; slug: string } | null
    media: { id: string; url: string; type: string }[]
    specifications?:
      | Record<string, unknown>
      | import('@/lib/types/specifications.types').StructuredSpecifications
      | null
    customFields?: Record<string, unknown> | null
    vendor?: { companyName: string; logo?: string | null } | null
    shortDescription?: string | null
    longDescription?: string | null
    boxContents?: string | null
  }
  recommendations: EquipmentCardItem[]
}

export function EquipmentDetail({ equipment, recommendations }: EquipmentDetailProps) {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const addItem = useCartStore((s) => s.addItem)
  const defaultDates = useMemo(getDefaultDates, [])
  const [startDate, setStartDate] = useState(defaultDates.start)
  const [endDate, setEndDate] = useState(defaultDates.end)
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false)
  const maxQty = Math.min(equipment.quantityAvailable ?? 1, 10)
  const availabilityStatus = getAvailabilityStatus(equipment.quantityAvailable, true)
  const available = availabilityStatus === 'available' || availabilityStatus === 'limited'

  const handleAddToCart = async () => {
    if (!available) return
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (end <= start) {
      toast({
        title: t('common.error'),
        description: 'End date must be after start date',
        variant: 'destructive',
      })
      return
    }
    setIsAdding(true)
    try {
      await addItem({
        itemType: 'EQUIPMENT',
        equipmentId: equipment.id,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        quantity,
        dailyRate: equipment.dailyPrice,
      })
      setAdded(true)
      toast({
        title: t('common.addToCart'),
        description: equipment.model ?? equipment.sku,
      })
    } catch (e) {
      toast({
        title: t('common.error'),
        description: e instanceof Error ? e.message : 'Failed to add to cart',
        variant: 'destructive',
      })
    } finally {
      setIsAdding(false)
    }
  }

  const title = equipment.model ?? equipment.sku

  const rentalDays = useMemo(() => {
    const s = new Date(startDate)
    const e = new Date(endDate)
    const diff = Math.ceil((e.getTime() - s.getTime()) / 86400000)
    return diff > 0 ? diff : 1
  }, [startDate, endDate])

  const estimatedTotal = rentalDays * equipment.dailyPrice * quantity

  return (
    <>
      <div className="space-y-10 pb-24 lg:pb-0">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-text-muted">
          <Link href="/" className="transition-colors hover:text-text-heading">
            {t('nav.home')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/equipment" className="transition-colors hover:text-text-heading">
            {t('nav.equipment')}
          </Link>
          {equipment.category && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link
                href={`/equipment?categoryId=${equipment.category.slug}`}
                className="transition-colors hover:text-text-heading"
              >
                {equipment.category.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate font-medium text-text-heading">{title}</span>
        </nav>

        {/* Main layout: Gallery + Booking sidebar */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px] lg:gap-10">
          {/* Left column: Gallery + Tabs */}
          <div className="min-w-0 space-y-8">
            <EquipmentGallery media={equipment.media} alt={title} />

            {/* Quick spec pills (between gallery and tabs, structured specs only) */}
            {equipment.specifications &&
              isStructuredSpecifications(equipment.specifications) &&
              equipment.specifications.quickSpecs &&
              equipment.specifications.quickSpecs.length > 0 && (
                <QuickSpecPills specs={equipment.specifications.quickSpecs} />
              )}

            {/* Product info tabs – horizontal scroll on mobile */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="scrollbar-hide h-auto w-full snap-x snap-mandatory justify-start gap-0 overflow-x-auto rounded-2xl border border-border-light/60 bg-surface-light p-1 lg:overflow-visible">
                <TabsTrigger
                  value="overview"
                  className="min-w-0 shrink-0 snap-start rounded-xl px-5 py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-text-heading data-[state=active]:shadow-sm"
                >
                  {t('equipment.tabOverview') ?? 'Overview'}
                </TabsTrigger>
                <TabsTrigger
                  value="specs"
                  className="min-w-0 shrink-0 snap-start rounded-xl px-5 py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-text-heading data-[state=active]:shadow-sm"
                >
                  {t('equipment.tabSpecs') ?? 'Specifications'}
                </TabsTrigger>
                <TabsTrigger
                  value="included"
                  className="min-w-0 shrink-0 snap-start rounded-xl px-5 py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-text-heading data-[state=active]:shadow-sm"
                >
                  {t('equipment.tabIncluded') ?? "What's Included"}
                </TabsTrigger>
                <TabsTrigger
                  value="addons"
                  className="min-w-0 shrink-0 snap-start rounded-xl px-5 py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-text-heading data-[state=active]:shadow-sm"
                >
                  {t('equipment.tabAddons') ?? 'Add-ons'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="pt-6">
                <div className="rounded-2xl border border-border-light/60 bg-white p-6 shadow-card">
                  {equipment.shortDescription || equipment.longDescription ? (
                    <div className="space-y-3 text-body-main leading-relaxed text-text-body">
                      {equipment.shortDescription && <p>{equipment.shortDescription}</p>}
                      {equipment.longDescription && <p>{equipment.longDescription}</p>}
                    </div>
                  ) : (
                    <p className="text-body-main leading-relaxed text-text-body">
                      {title} — {equipment.brand?.name ?? ''} {equipment.category?.name ?? ''}. SKU:{' '}
                      <span className="font-mono text-sm text-text-muted">{equipment.sku}</span>.
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="specs" className="pt-6">
                <SpecificationsDisplay
                  specifications={(equipment.specifications ?? null) as AnySpecifications | null}
                  locale={locale === 'ar' ? 'ar' : 'en'}
                  showQuickSpecPills={false}
                  showAllLabel={t('equipment.specShowAll')}
                  showLessLabel={t('equipment.specShowLess')}
                />
              </TabsContent>

              <TabsContent value="included" className="pt-6">
                <div className="rounded-2xl border border-border-light/60 bg-white p-6 shadow-card">
                  {equipment.boxContents ? (
                    <p className="whitespace-pre-line text-body-main text-text-body">
                      {equipment.boxContents}
                    </p>
                  ) : (
                    <p className="text-body-main text-text-body">
                      {t('equipment.includedPlaceholder')}
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="addons" className="pt-6">
                <div className="rounded-2xl border border-border-light/60 bg-white p-6 shadow-card">
                  <p className="text-body-main text-text-body">
                    {t('equipment.addonsPlaceholder') ??
                      'Insurance and optional accessories can be added at checkout.'}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right column: Sticky booking sidebar (hidden on mobile; use bottom bar + sheet) */}
          <div className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
            <div className="space-y-5 rounded-2xl border border-border-light/60 bg-white p-6 shadow-card-elevated">
              {/* Title + brand */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {equipment.brand && (
                      <p className="text-label-small uppercase tracking-wider text-text-muted">
                        {equipment.brand.name}
                      </p>
                    )}
                    <h1 className="mt-1 text-xl font-bold leading-tight text-text-heading">
                      {title}
                    </h1>
                  </div>
                  <SaveEquipmentButton equipmentId={equipment.id} />
                </div>
                {equipment.category && (
                  <Link
                    href={`/equipment?categoryId=${equipment.category.slug}`}
                    className="mt-1 inline-block text-sm text-brand-primary transition-colors hover:text-brand-primary-hover"
                  >
                    {equipment.category.name}
                  </Link>
                )}
                {equipment.vendor && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm">
                    <span className="text-muted-foreground">{t('equipment.listedBy')}</span>
                    <span className="font-medium">{equipment.vendor.companyName}</span>
                  </div>
                )}
              </div>

              {/* Availability */}
              <div className="flex items-center gap-3">
                <AvailabilityBadge
                  status={availabilityStatus}
                  quantityAvailable={equipment.quantityAvailable ?? 0}
                />
                <AvailabilityPreview equipmentId={equipment.id} />
              </div>

              {/* Pricing */}
              <EquipmentPriceBlock
                dailyPrice={equipment.dailyPrice}
                weeklyPrice={equipment.weeklyPrice}
                monthlyPrice={equipment.monthlyPrice}
              />

              {/* Divider */}
              <div className="border-t border-border-light/60" />

              {/* Date selection */}
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-text-heading">
                  <Calendar className="h-4 w-4 text-brand-primary" />
                  {t('equipment.selectDates')}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="start-date" className="text-xs font-medium text-text-muted">
                      {t('checkout.startDate')}
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      min={defaultDates.start}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-xl border-border-light focus-visible:ring-brand-primary/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="end-date" className="text-xs font-medium text-text-muted">
                      {t('checkout.endDate')}
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-xl border-border-light focus-visible:ring-brand-primary/20"
                    />
                  </div>
                </div>
              </div>

              {/* Quantity */}
              {maxQty > 1 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-text-muted">
                    {t('equipment.qty')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      <span className="text-lg">−</span>
                    </Button>
                    <span className="w-8 text-center font-semibold">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      disabled={quantity >= maxQty}
                      onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    >
                      <span className="text-lg">+</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Estimated total */}
              {equipment.dailyPrice > 0 && (
                <div className="rounded-xl bg-surface-light px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">{t('equipment.estimatedTotal')}</span>
                    <span className="text-lg font-bold text-brand-primary">
                      {estimatedTotal.toLocaleString()} SAR
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {t('equipment.forDays').replace('{days}', String(rentalDays))} ×{' '}
                    {quantity > 1 ? `${quantity} ×` : ''} {equipment.dailyPrice.toLocaleString()}{' '}
                    SAR
                  </p>
                </div>
              )}

              {/* Add to cart */}
              <div className="space-y-3">
                <Button
                  size="lg"
                  disabled={!available || isAdding}
                  onClick={handleAddToCart}
                  className="h-12 w-full rounded-xl bg-brand-primary font-semibold shadow-md transition-all hover:bg-brand-primary-hover hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
                >
                  {isAdding ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {t('common.loading') ?? 'Adding...'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      {t('common.addToCart')}
                    </span>
                  )}
                </Button>

                {added && (
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="h-12 w-full rounded-xl border-brand-primary/20 font-semibold text-brand-primary hover:bg-brand-primary/5"
                  >
                    <Link href="/cart" className="flex items-center gap-2">
                      {t('cart.viewCart')}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>

              {/* WhatsApp Quick Rent */}
              <WhatsAppRentButton equipmentName={title} equipmentId={equipment.id} />

              {/* Deposit notice */}
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-3">
                <p className="text-xs text-amber-700">{t('checkout.depositNote')}</p>
              </div>

              {/* Trust signals */}
              <div className="space-y-2.5 border-t border-border-light/60 pt-4">
                {[
                  { Icon: Clock, text: t('home.trustSupport') },
                  { Icon: Truck, text: t('equipment.trustDelivery') },
                  { Icon: CheckCircle2, text: t('equipment.trustVerified') },
                ].map(({ Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 text-sm text-text-muted">
                    <Icon className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: sticky Add to Booking bar (above bottom nav) */}
        <div className="fixed bottom-20 left-0 right-0 z-40 flex items-center justify-between gap-4 border-t border-border bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden">
          <div>
            <span className="text-lg font-bold text-brand-primary">
              {equipment.dailyPrice.toLocaleString()} SAR
            </span>
            <span className="ms-1 text-sm text-text-muted">/ {t('common.pricePerDay')}</span>
          </div>
          <Button
            size="lg"
            disabled={!available}
            onClick={() => setBookingSheetOpen(true)}
            className="min-h-[44px] max-w-[200px] flex-1 rounded-xl bg-brand-primary font-semibold hover:bg-brand-primary-hover active:scale-95"
          >
            {t('common.addToBooking') ?? 'Add to Booking'}
          </Button>
        </div>

        <BottomSheet
          open={bookingSheetOpen}
          onOpenChange={setBookingSheetOpen}
          title={t('common.addToBooking') ?? 'Add to Booking'}
        >
          <div className="space-y-5 p-4">
            <EquipmentPriceBlock
              dailyPrice={equipment.dailyPrice}
              weeklyPrice={equipment.weeklyPrice}
              monthlyPrice={equipment.monthlyPrice}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mobile-start-date" className="text-xs font-medium text-text-muted">
                  {t('checkout.startDate')}
                </Label>
                <Input
                  id="mobile-start-date"
                  type="date"
                  value={startDate}
                  min={defaultDates.start}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-12 w-full rounded-xl border-border-light text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mobile-end-date" className="text-xs font-medium text-text-muted">
                  {t('checkout.endDate')}
                </Label>
                <Input
                  id="mobile-end-date"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-12 w-full rounded-xl border-border-light text-base"
                />
              </div>
            </div>
            {maxQty > 1 && (
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium text-text-muted">{t('equipment.qty')}</Label>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-lg"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  −
                </Button>
                <span className="w-8 text-center font-semibold">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-lg"
                  disabled={quantity >= maxQty}
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                >
                  +
                </Button>
              </div>
            )}
            <div className="rounded-xl bg-surface-light px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">{t('equipment.estimatedTotal')}</span>
                <span className="text-lg font-bold text-brand-primary">
                  {estimatedTotal.toLocaleString()} SAR
                </span>
              </div>
            </div>
            <Button
              size="lg"
              disabled={!available || isAdding}
              onClick={() => {
                handleAddToCart()
                setBookingSheetOpen(false)
              }}
              className="h-12 w-full rounded-xl bg-brand-primary font-semibold"
            >
              {isAdding ? (t('common.loading') ?? 'Adding...') : t('common.addToCart')}
            </Button>
          </div>
        </BottomSheet>
      </div>

      {/* Frequently Rented Together */}
      <FrequentlyRentedTogether equipmentId={equipment.id} />

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="border-t border-border-light/50 pt-10">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-section-title text-text-heading">
                {t('common.recommendations')}
              </h2>
              <p className="mt-1 text-sm text-text-muted">{t('equipment.similarItems')}</p>
            </div>
            <Button
              variant="ghost"
              className="hidden items-center gap-1 font-semibold text-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary-hover sm:inline-flex"
              asChild
            >
              <Link href="/equipment">
                {t('common.viewAll')}
                <ArrowRight className="ms-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {recommendations.map((item) => (
              <div key={item.id} className="w-[75vw] shrink-0 snap-start sm:w-auto">
                <EquipmentCard item={item} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
