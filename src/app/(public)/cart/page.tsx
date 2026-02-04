/**
 * Cart page (Phase 3.1): list, summary, coupon.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { CartList } from '@/components/features/cart/cart-list'

export default function CartPage() {
  const { t } = useLocale()

  return (
    <main className="container py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{t('cart.title')}</h1>
      <CartList />
    </main>
  )
}
