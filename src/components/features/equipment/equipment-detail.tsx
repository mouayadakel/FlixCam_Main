/**
 * Equipment detail page – premium layout with breadcrumb, gallery left,
 * sticky booking sidebar right, modern tabs, recommendations grid.
 */

'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
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
import { SaveEquipmentButton } from './save-equipment-button'
import type { EquipmentCardItem } from './equipment-card'
import {
  ChevronRight,
  ShoppingCart,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Shield,
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
    specifications?: Record<string, unknown> | null
    customFields?: Record<string, unknown> | null
    vendor?: { companyName: string; logo?: string | null } | null
  }
  recommendations: EquipmentCardItem[]
}

export function EquipmentDetail({ equipment, recommendations }: EquipmentDetailProps) {
  const { t } = useLocale()
  const { toast } = useToast()
  const addItem = useCartStore((s) => s.addItem)
  const defaultDates = useMemo(getDefaultDates, [])
  const [startDate, setStartDate] = useState(defaultDates.start)
  const [endDate, setEndDate] = useState(defaultDates.end)
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(false)
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
        quantity: 1,
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

  return (
    <div className="space-y-10">
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
          <EquipmentGallery
            media={equipment.media}
            alt={title}
          />

          {/* Product info tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start gap-0 rounded-2xl border border-border-light/60 bg-surface-light p-1 h-auto">
              <TabsTrigger
                value="overview"
                className="rounded-xl px-5 py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-text-heading"
              >
                {t('equipment.tabOverview') ?? 'Overview'}
              </TabsTrigger>
              <TabsTrigger
                value="specs"
                className="rounded-xl px-5 py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-text-heading"
              >
                {t('equipment.tabSpecs') ?? 'Specifications'}
              </TabsTrigger>
              <TabsTrigger
                value="included"
                className="rounded-xl px-5 py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-text-heading"
              >
                {t('equipment.tabIncluded') ?? "What's Included"}
              </TabsTrigger>
              <TabsTrigger
                value="addons"
                className="rounded-xl px-5 py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-text-heading"
              >
                {t('equipment.tabAddons') ?? 'Add-ons'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-6">
              <div className="rounded-2xl border border-border-light/60 bg-white p-6 shadow-card">
                <p className="text-body-main leading-relaxed text-text-body">
                  {title} — {equipment.brand?.name ?? ''} {equipment.category?.name ?? ''}.
                  SKU: <span className="font-mono text-sm text-text-muted">{equipment.sku}</span>.
                  Available for daily, weekly, and monthly rental.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="specs" className="pt-6">
              <div className="rounded-2xl border border-border-light/60 bg-white shadow-card overflow-hidden">
                {equipment.specifications && Object.keys(equipment.specifications).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        {Object.entries(equipment.specifications).map(([key, value], idx) => (
                          <tr
                            key={key}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-surface-light/50'}
                          >
                            <td className="px-5 py-3.5 font-medium text-text-heading capitalize whitespace-nowrap">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </td>
                            <td className="px-5 py-3.5 text-text-body">
                              {String(value ?? '—')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-sm text-text-muted">
                      {t('equipment.noSpecs') ?? 'No specifications listed.'}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="included" className="pt-6">
              <div className="rounded-2xl border border-border-light/60 bg-white p-6 shadow-card">
                <p className="text-body-main text-text-body">
                  {t('equipment.includedPlaceholder') ?? 'Standard rental includes the unit as described. Accessories or cases may be listed in specifications.'}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="addons" className="pt-6">
              <div className="rounded-2xl border border-border-light/60 bg-white p-6 shadow-card">
                <p className="text-body-main text-text-body">
                  {t('equipment.addonsPlaceholder') ?? 'Insurance and optional accessories can be added at checkout.'}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column: Sticky booking sidebar */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border-light/60 bg-white p-6 shadow-card-elevated space-y-5">
            {/* Title + brand */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {equipment.brand && (
                    <p className="text-label-small uppercase tracking-wider text-text-muted">
                      {equipment.brand.name}
                    </p>
                  )}
                  <h1 className="mt-1 text-xl font-bold text-text-heading leading-tight">
                    {title}
                  </h1>
                </div>
                <SaveEquipmentButton equipmentId={equipment.id} />
              </div>
              {equipment.category && (
                <Link
                  href={`/equipment?categoryId=${equipment.category.slug}`}
                  className="mt-1 inline-block text-sm text-brand-primary hover:text-brand-primary-hover transition-colors"
                >
                  {equipment.category.name}
                </Link>
              )}
              {equipment.vendor && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm">
                  <span className="text-muted-foreground">Listed by</span>
                  <span className="font-medium">{equipment.vendor.companyName}</span>
                </div>
              )}
            </div>

            {/* Availability */}
            <AvailabilityBadge
              status={availabilityStatus}
              quantityAvailable={equipment.quantityAvailable ?? 0}
            />

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
              <p className="text-sm font-semibold text-text-heading flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand-primary" />
                Select rental dates
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

            {/* Add to cart */}
            <div className="space-y-3">
              <Button
                size="lg"
                disabled={!available || isAdding}
                onClick={handleAddToCart}
                className="w-full bg-brand-primary hover:bg-brand-primary-hover rounded-xl h-12 font-semibold shadow-md transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
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
                  className="w-full rounded-xl h-12 border-brand-primary/20 text-brand-primary hover:bg-brand-primary/5 font-semibold"
                >
                  <Link href="/cart" className="flex items-center gap-2">
                    {t('cart.viewCart')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>

            {/* Trust signals */}
            <div className="border-t border-border-light/60 pt-4 space-y-2.5">
              {[
                { Icon: Shield, text: t('home.trustInsured') || 'Insured rentals' },
                { Icon: Clock, text: t('home.trustSupport') || '24/7 support' },
                { Icon: Truck, text: 'Delivery available' },
                { Icon: CheckCircle2, text: 'Tested & verified equipment' },
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

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="border-t border-border-light/50 pt-10">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-section-title text-text-heading">
                {t('common.recommendations')}
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Similar equipment you might like
              </p>
            </div>
            <Button
              variant="ghost"
              className="hidden sm:inline-flex items-center gap-1 text-brand-primary hover:text-brand-primary-hover hover:bg-brand-primary/5 font-semibold"
              asChild
            >
              <Link href="/equipment">
                {t('common.viewAll')}
                <ArrowRight className="ms-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recommendations.map((item) => (
              <EquipmentCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
