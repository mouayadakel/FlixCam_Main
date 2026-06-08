'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CartItem } from '@/lib/stores/cart.store'
import Image from 'next/image'
import { DepositInsuranceSummary } from './deposit-insurance-summary'

interface CheckoutBookingSummaryCardProps {
  items: CartItem[]
  subtotal: number
  discountAmount?: number
  tax: number
  total: number
  depositAmount?: number
  couponCodeInput: string
  onCouponCodeInputChange: (value: string) => void
  onApplyCoupon: () => void
  onClearCoupon: () => void
  hasAppliedCoupon: boolean
  couponFeedback?: string | null
  isApplyingCoupon: boolean
  formatSar: (value: number) => string
  formatDate: (value: string | Date | null | undefined) => string
  itemTypeLabels: Record<string, string>
}

export function CheckoutBookingSummaryCard({
  items,
  subtotal,
  discountAmount = 0,
  tax,
  total,
  depositAmount = 0,
  couponCodeInput,
  onCouponCodeInputChange,
  onApplyCoupon,
  onClearCoupon,
  hasAppliedCoupon,
  couponFeedback,
  isApplyingCoupon,
  formatSar,
  formatDate,
  itemTypeLabels,
}: CheckoutBookingSummaryCardProps) {
  const discountPercent =
    subtotal > 0 && discountAmount > 0 ? Math.round((discountAmount / subtotal) * 100) : 0

  const getDaysCount = (item: CartItem): number => {
    if (typeof item.days === 'number' && item.days > 0) return item.days
    if (!item.startDate || !item.endDate) return 1
    const start = new Date(item.startDate)
    const end = new Date(item.endDate)
    const diffMs = end.getTime() - start.getTime()
    if (!Number.isFinite(diffMs) || diffMs < 0) return 1
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  }

  return (
    <div className="rounded-2xl border border-white/50 bg-white/40 p-6 shadow-xl backdrop-blur-md">
      <h3 className="mb-4 text-lg font-bold text-[#111827]">أحدث الحجوزات ({items.length})</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-white p-3"
          >
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[#F3F4F6]">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.equipmentName ?? item.kitName ?? item.studioName ?? 'Booking item'}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#111827]">
                {(item as { name?: string }).name ||
                  item.equipmentName ||
                  item.kitName ||
                  item.studioName ||
                  itemTypeLabels[item.itemType] ||
                  item.itemType}
              </p>
              <p className="text-xs text-[#6B7280]">
                الكمية: {item.quantity}
                {' · '}
                {getDaysCount(item)} أيام
                {(item.startDate || item.endDate) &&
                  ` · حجز بتاريخ: ${formatDate(item.startDate)} - ${formatDate(item.endDate)}`}
              </p>
            </div>
            <p className="text-sm font-semibold text-[#111827]">{formatSar(item.subtotal ?? 0)}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-[#E5E7EB] bg-white p-3">
        <p className="text-sm font-medium text-[#111827]">تطبيق رمز القسيمة</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            id="coupon-input"
            value={couponCodeInput}
            onChange={(event) => onCouponCodeInputChange(event.target.value)}
            placeholder="أدخل الرمز"
            className="h-10 rounded-lg border-[#E5E7EB]"
          />
          <Button
            type="button"
            onClick={onApplyCoupon}
            disabled={isApplyingCoupon || !couponCodeInput.trim()}
            className="h-10 rounded-lg bg-[#5A31F4] px-4 hover:bg-[#4a28c9]"
          >
            تطبيق
          </Button>
          {hasAppliedCoupon && (
            <Button type="button" variant="outline" onClick={onClearCoupon} className="h-10 rounded-lg">
              حذف
            </Button>
          )}
        </div>
        {couponFeedback && <p className="mt-2 text-xs text-[#6B7280]">{couponFeedback}</p>}
      </div>

      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between text-[#6B7280]">
          <dt>Subtotal</dt>
          <dd>{formatSar(subtotal)}</dd>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-[#10B981]">
            <dt>Discount ({discountPercent}%)</dt>
            <dd>-{formatSar(discountAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between text-[#6B7280]">
          <dt>VAT</dt>
          <dd>{formatSar(tax)}</dd>
        </div>
        {depositAmount > 0 && (
          <DepositInsuranceSummary depositAmount={depositAmount} />
        )}
        <div className="flex justify-between border-t border-[#E5E7EB] pt-2 text-lg font-bold text-[#111827]">
          <dt>Total after VAT & discount</dt>
          <dd>{formatSar(total)}</dd>
        </div>
      </dl>
    </div>
  )
}
