/**
 * Mini cart icon with animated count badge from cart store, links to /cart.
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/use-locale'
import { useCartStore } from '@/lib/stores/cart.store'

export function MiniCart() {
  const { t } = useLocale()
  const { items, fetchCart } = useCartStore()
  const count = items.reduce((sum, i) => sum + i.quantity, 0)
  const [bouncing, setBouncing] = useState(false)
  const prevCount = useRef(count)

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  useEffect(() => {
    if (count !== prevCount.current && count > 0) {
      setBouncing(true)
      const timer = setTimeout(() => setBouncing(false), 300)
      prevCount.current = count
      return () => clearTimeout(timer)
    }
    prevCount.current = count
  }, [count])

  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      aria-label={t('nav.cart')}
      className="relative rounded-full transition-colors hover:bg-brand-primary/5 hover:text-brand-primary"
    >
      <Link href="/cart">
        <ShoppingCart className="h-5 w-5" />
        {count > 0 && (
          <span
            className={`absolute -end-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-white shadow-sm ${
              bouncing ? 'animate-badge-bounce' : ''
            }`}
            aria-hidden
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    </Button>
  )
}
