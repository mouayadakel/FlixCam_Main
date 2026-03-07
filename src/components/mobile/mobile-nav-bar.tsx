'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Camera, ShoppingCart, Building2, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/lib/stores/cart.store'

const NAV_ITEMS: {
  href: string
  label: string
  icon: typeof House
  showBadge?: boolean
}[] = [
  { href: '/', label: 'Home', icon: House },
  { href: '/equipment', label: 'Equipment', icon: Camera },
  { href: '/cart', label: 'Cart', icon: ShoppingCart, showBadge: true },
  { href: '/studios', label: 'Studios', icon: Building2 },
  { href: '/portal/dashboard', label: 'Account', icon: User },
]

/**
 * Fixed bottom navigation bar for PUBLIC site only. 5 items.
 * Hidden on lg and above. RTL-aware. Safe area inset bottom.
 */
function MobileNavBar() {
  const pathname = usePathname()
  const cartCount = useCartStore((s) => s.items.length)

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className={cn(
        'fixed bottom-0 start-0 end-0 z-50 lg:hidden',
        'border-t border-border bg-white/90 backdrop-blur-md',
        'pb-[env(safe-area-inset-bottom)]'
      )}
    >
      <div className={cn('flex h-16 items-center justify-around', 'rtl:flex-row-reverse')}>
        {NAV_ITEMS.map(({ href, label, icon: Icon, showBadge }) => {
          const p = pathname ?? ''
          const isActive = href === '/' ? p === '/' : p === href || p.startsWith(href + '/')
          const count = showBadge ? cartCount : 0
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-3 transition-transform active:scale-95',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
            >
              <span className="relative inline-block">
                <Icon className={cn('h-6 w-6', isActive && 'text-primary')} aria-hidden />
                {showBadge && count > 0 && (
                  <span
                    className="absolute -end-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground"
                    aria-label={`${count} items in cart`}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </span>
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export { MobileNavBar }
