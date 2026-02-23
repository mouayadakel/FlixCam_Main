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

export function CartList() {
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

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {items.map((item) => {
            const row = (
              <CartItemRow
                key={item.id}
                item={item}
                onUpdateQuantity={(itemId, qty) => updateItem(itemId, { quantity: qty })}
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
        <div className="hidden space-y-4 lg:block">
          <CouponField
            appliedCode={couponCode}
            onApply={applyCoupon}
            onRemove={removeCoupon}
            error={error}
          />
          <CartSummary
            subtotal={subtotal}
            discountAmount={discountAmount}
            total={total}
            itemCount={items.length}
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
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="mx-auto flex max-w-public-container items-center justify-between gap-4">
          <div>
            <span className="text-sm text-text-muted">{t('cart.total')}</span>
            <p className="text-xl font-bold text-brand-primary">{total.toLocaleString()} SAR</p>
          </div>
          <Button
            asChild
            size="lg"
            className="min-h-[44px] max-w-[200px] flex-1 rounded-xl bg-brand-primary font-semibold"
            disabled={items.length === 0}
          >
            <Link href="/checkout">{t('cart.checkout')}</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
