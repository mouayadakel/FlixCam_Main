/**
 * Mini cart icon with count from cart store, links to /cart (Phase 3.1).
 */

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/use-locale'
import { useCartStore } from '@/lib/stores/cart.store'

export function MiniCart() {
  const { t } = useLocale()
  const { items, fetchCart } = useCartStore()
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  return (
    <Button variant="ghost" size="icon" asChild aria-label={t('nav.cart')}>
      <Link href="/cart" className="relative">
        <ShoppingCart className="h-5 w-5" />
        {count > 0 && (
          <span
            className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
            aria-hidden
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    </Button>
  )
}
