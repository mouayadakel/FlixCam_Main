/**
 * Cart list + summary + coupon (Phase 3.1).
 */

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/stores/cart.store'
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
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{t('cart.empty')}</p>
        <Button asChild>
          <Link href="/equipment">{t('cart.continueShopping')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            onUpdateQuantity={(itemId, qty) => updateItem(itemId, { quantity: qty })}
            onRemove={removeItem}
          />
        ))}
      </div>
      <div className="space-y-4">
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
  )
}
