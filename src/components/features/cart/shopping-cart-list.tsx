'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Minus, Plus, X } from 'lucide-react'
import type { CartItem } from '@/lib/stores/cart.store'
import { formatSar as formatSarIntl } from '@/lib/utils/format.utils'
import { CartCrossSell } from './cart-cross-sell'

interface ShoppingCartListProps {
  items: CartItem[]
  locale: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  finalTotal: number
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onUpdateDates: (itemId: string, startDate: string, endDate: string) => void
  onRemove: (itemId: string) => void
}

const PLACEHOLDER_IMAGE = '/images/equipment-placeholder.svg'

function getItemTitle(item: CartItem): string {
  return item.equipmentName ?? item.kitName ?? item.studioName ?? item.itemType
}

function toDateInputValue(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function getDays(item: CartItem): number {
  if (typeof item.days === 'number' && item.days > 0) return item.days
  if (!item.startDate || !item.endDate) return 1
  const diffMs = new Date(item.endDate).getTime() - new Date(item.startDate).getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return 1
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

/** YYYY-MM-DD → localized medium date (word-style month) */
function formatSpelledDate(isoDay: string, locale: string): string {
  const d = new Date(`${isoDay}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoDay
  return d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-SA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** One equipment unit’s daily rate, or derived from line subtotal */
function getUnitDailyRate(item: CartItem, days: number): number | null {
  if (item.dailyRate != null && item.dailyRate > 0) return item.dailyRate
  const denom = days * Math.max(1, item.quantity)
  if (denom <= 0) return null
  const v = item.subtotal / denom
  return Number.isFinite(v) && v > 0 ? v : null
}

export function ShoppingCartList({
  items,
  locale,
  subtotal,
  discountAmount,
  taxAmount,
  finalTotal,
  onUpdateQuantity,
  onUpdateDates,
  onRemove,
}: ShoppingCartListProps) {
  const isArabic = locale === 'ar'
  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <section className="rounded-2xl border border-[#EDF2F7] bg-white p-6 shadow-sm">
      <div className="mb-4 text-sm text-[#718096]">
        <span>{isArabic ? 'الرئيسية / السلة' : 'Main / Shopping Cart'}</span>
      </div>
      <h2 className="mb-8 text-3xl font-bold text-[#1A202C]">
        {isArabic ? 'سلة المشتريات' : 'Shopping Cart'}
      </h2>

      <div className="mb-4 flex items-center justify-between border-b border-[#EDF2F7] pb-4 text-sm text-[#718096]">
        <span className="w-1/2">{isArabic ? 'العنصر' : 'Item'}</span>
        <span className="w-1/4 text-center">{isArabic ? 'الكمية' : 'Qty'}</span>
        <span className="w-1/4 text-end">{isArabic ? 'الإجمالي الفرعي' : 'Subtotal'}</span>
      </div>

      <div className="flex flex-col">
        {items.map((item) => {
          const startDate = toDateInputValue(item.startDate) || todayStr
          const endDate = toDateInputValue(item.endDate) || startDate
          const days = getDays(item)
          const isStudio = item.itemType === 'STUDIO'
          const unitDaily = getUnitDailyRate(item, days)
          const startSpelled = formatSpelledDate(startDate, locale)
          const endSpelled = formatSpelledDate(endDate, locale)

          return (
            <div key={item.id} className="flex flex-col gap-4 border-b border-[#EDF2F7] py-6 lg:flex-row lg:items-center">
              <div className="flex w-full items-center gap-6 lg:w-1/2">
                <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-[#EDF2F7]">
                  <Image
                    src={item.imageUrl || PLACEHOLDER_IMAGE}
                    alt={getItemTitle(item)}
                    fill
                    className="object-cover"
                    sizes="80px"
                    unoptimized={Boolean(item.imageUrl?.startsWith('http'))}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-[#1A202C]">{getItemTitle(item)}</p>
                  <p className="mt-1 text-sm text-[#718096]">
                    {days} {isArabic ? 'أيام' : 'days'}
                    <span className="mx-1.5 text-[#CBD5E0]">·</span>
                    {isArabic ? (
                      <>
                        من <span className="text-[#4A5568]">{startSpelled}</span> إلى{' '}
                        <span className="text-[#4A5568]">{endSpelled}</span>
                      </>
                    ) : (
                      <>
                        From <span className="text-[#4A5568]">{startSpelled}</span> to{' '}
                        <span className="text-[#4A5568]">{endSpelled}</span>
                      </>
                    )}
                  </p>
                  {unitDaily != null && (
                    <p className="mt-1 text-sm font-medium text-[#4A5568]">
                      {isStudio
                        ? isArabic
                          ? `سعر الوحدة: ${formatSarIntl(unitDaily, locale)}`
                          : `Unit price: ${formatSarIntl(unitDaily, locale)}`
                        : isArabic
                          ? `سعر اليوم (للوحدة): ${formatSarIntl(unitDaily, locale)}`
                          : `Unit price (per day): ${formatSarIntl(unitDaily, locale)}`}
                    </p>
                  )}
                  <div className="mt-3 grid max-sm:grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#718096]">
                        {isArabic ? 'تاريخ البداية' : 'Start date'}
                      </label>
                      <Input
                        type="date"
                        value={startDate}
                        min={todayStr}
                        className="h-11 rounded-lg border border-[#EDF2F7]"
                        onChange={(event) => {
                          const nextStart = event.target.value
                          const safeEnd = nextStart > endDate ? nextStart : endDate
                          onUpdateDates(item.id, nextStart, safeEnd)
                        }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#718096]">
                        {isArabic ? 'تاريخ النهاية' : 'End date'}
                      </label>
                      <Input
                        type="date"
                        value={endDate}
                        min={startDate || todayStr}
                        className="h-11 rounded-lg border border-[#EDF2F7]"
                        onChange={(event) => onUpdateDates(item.id, startDate, event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex w-full justify-between gap-4 lg:w-1/4 lg:justify-center">
                <div className="flex items-center gap-4 rounded-lg border border-[#EDF2F7] px-3 py-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    aria-label="decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-6 text-center text-sm font-medium text-[#1A202C]">{item.quantity}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    aria-label="increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex w-full items-center justify-between lg:w-1/4 lg:justify-end lg:gap-3">
                <span className="text-lg font-bold text-[#1A202C]">{formatSarIntl(item.subtotal, locale)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-[#718096] hover:text-red-600"
                  onClick={() => onRemove(item.id)}
                  aria-label="remove item"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <CartCrossSell />

      <div className="mt-6 rounded-xl border border-[#EDF2F7] bg-white p-4">
        <div className="flex items-center justify-between text-sm text-[#718096]">
          <span>Subtotal</span>
          <span>{formatSarIntl(subtotal, locale)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="mt-2 flex items-center justify-between text-sm text-[#10B981]">
            <span>Discount</span>
            <span>-{formatSarIntl(discountAmount, locale)}</span>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between text-sm text-[#718096]">
          <span>VAT</span>
          <span>{formatSarIntl(taxAmount, locale)}</span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-[#EDF2F7] pt-3 text-base font-bold text-[#1A202C]">
          <span>Total after VAT & discount</span>
          <span>{formatSarIntl(finalTotal, locale)}</span>
        </div>
      </div>
    </section>
  )
}
