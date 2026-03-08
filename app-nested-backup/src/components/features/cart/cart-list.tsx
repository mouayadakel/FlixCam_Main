/**
 * Cart list + summary + coupon (Phase 3.1).
 */

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/stores/cart.store'
import { SwipeActionItem } from '@/components/mobile/swipe-action'
import { CartItemRow } from './cart-item-row'
import { CartSummary } from './cart-summary'
import { CouponField } from './coupon-field'

interface CartListProps {
  onStartCheckout?: () => void
  /** When true, render summary sidebar. When false, only render items (for use in unified grid) */
  showSummary?: boolean
}

export function CartList({ onStartCheckout, showSummary = true }: CartListProps) {
  const { t } = useLocale()
  const {
    items,
    subtotal,
    discountAmount,
    total,
    couponCode,
    isLoading,
    error,
    fetchCart,
    updateItem,
    removeItem,
    applyCoupon,
    removeCoupon,
    revalidate,
  } = useCartStore()

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  useEffect(() => {
    if (items.length > 0) {
      revalidate()
    }
  }, [items.length, revalidate])

  if (isLoading) {
    return <p className="text-muted-foreground">{t('common.loading')}</p>
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-muted-foreground">{t('cart.empty')}</p>
        <Button asChild>
          <Link href="/equipment">{t('cart.continueShopping')}</Link>
        </Button>
      </div>
    )
  }

  const itemsContent = (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {items.map((item) => {
            const row = (
              <CartItemRow
                key={item.id}
                item={item}
                onUpdateQuantity={(itemId, qty) => updateItem(itemId, { quantity: qty })}
                onUpdateDates={(itemId, start, end) =>
                  updateItem(itemId, { startDate: start, endDate: end })
                }
                onRemove={removeItem}
              />
            )
            return (
              <SwipeActionItem
                key={item.id}
                className="rounded-lg"
                actions={
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-full min-w-[80px] rounded-none px-4"
                    onClick={() => removeItem(item.id)}
                    aria-label={t('cart.remove')}
                  >
                    {t('cart.remove')}
                  </Button>
                }
              >
                {row}
              </SwipeActionItem>
            )
          })}
    </div>
  )

  if (!showSummary) {
    return (
      <>
        {itemsContent}

      {/* Mobile: coupon above sticky bar; full summary in sticky bar */}
      <div className="mt-6 space-y-4 lg:hidden">
        <CouponField
          appliedCode={couponCode}
          onApply={applyCoupon}
          onRemove={removeCoupon}
          error={error}
        />
      </div>

      {/* Mobile: sticky order summary + Proceed (above bottom nav) */}
      <div className="fixed bottom-0 start-0 end-0 z-40 border-t border-border bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="mx-auto flex max-w-public-container items-center justify-between gap-4">
          <div>
            <span className="text-sm text-text-muted">{t('cart.total')}</span>
            <p className="text-xl font-bold text-brand-primary">
              {Math.round((subtotal - discountAmount) * 1.15 * 100) / 100} SAR
            </p>
          </div>
          {onStartCheckout ? (
            <Button
              type="button"
              size="lg"
              className="min-h-[44px] max-w-[200px] flex-1 rounded-xl bg-brand-primary font-semibold"
              disabled={items.length === 0}
              onClick={onStartCheckout}
            >
              {t('cart.checkout')}
            </Button>
          ) : (
            <Button
              asChild
              size="lg"
              className="min-h-[44px] max-w-[200px] flex-1 rounded-xl bg-brand-primary font-semibold"
              disabled={items.length === 0}
            >
              <Link href="/checkout">{t('cart.checkout')}</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">{itemsContent}</div>
        <div className="hidden max-h-[calc(100vh-8rem)] space-y-4 overflow-y-auto lg:sticky lg:top-24 lg:block lg:self-start">
          <CouponField
            appliedCode={couponCode}
            onApply={applyCoupon}
            onRemove={removeCoupon}
            error={error}
          />
          <CartSummary
            items={items}
            subtotal={subtotal}
            discountAmount={discountAmount}
            total={total}
            itemCount={items.length}
            onStartCheckout={onStartCheckout}
          />
        </div>
      </div>

      {/* Mobile: coupon above sticky bar; full summary in sticky bar */}
      <div className="mt-6 space-y-4 lg:hidden">
        <CouponField
          appliedCode={couponCode}
          onApply={applyCoupon}
          onRemove={removeCoupon}
          error={error}
        />
      </div>

      {/* Mobile: sticky order summary + Proceed (above bottom nav) */}
      <div className="fixed bottom-0 start-0 end-0 z-40 border-t border-border bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="mx-auto flex max-w-public-container items-center justify-between gap-4">
          <div>
            <span className="text-sm text-text-muted">{t('cart.total')}</span>
            <p className="text-xl font-bold text-brand-primary">
              {Math.round((subtotal - discountAmount) * 1.15 * 100) / 100} SAR
            </p>
          </div>
          {onStartCheckout ? (
            <Button
              type="button"
              size="lg"
              className="min-h-[44px] max-w-[200px] flex-1 rounded-xl bg-brand-primary font-semibold"
              disabled={items.length === 0}
              onClick={onStartCheckout}
            >
              {t('cart.checkout')}
            </Button>
          ) : (
            <Button
              asChild
              size="lg"
              className="min-h-[44px] max-w-[200px] flex-1 rounded-xl bg-brand-primary font-semibold"
              disabled={items.length === 0}
            >
              <Link href="/checkout">{t('cart.checkout')}</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
