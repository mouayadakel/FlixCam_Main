'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Calendar, Receipt, User } from 'lucide-react'

const TABS = [
  { href: '/portal/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/portal/bookings', label: 'حجوزاتي', icon: Calendar },
  { href: '/portal/invoices', label: 'الفواتير', icon: Receipt },
  { href: '/portal/profile', label: 'الملف الشخصي', icon: User },
] as const

/**
 * Portal bottom nav – same visual theme as public MobileNavBar (border, backdrop, active state).
 */
export function PortalMobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 start-0 end-0 z-50 flex items-center justify-around border-t border-border bg-background/90 py-2 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
      aria-label="Portal navigation"
    >
      <div className={cn('flex h-16 w-full items-center justify-around', 'rtl:flex-row-reverse')}>
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (pathname?.startsWith(href) && href !== '/portal/dashboard')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-public-button px-3 py-2 font-header-nav text-label-small font-medium transition-transform active:scale-95',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
            >
              <Icon className={cn('h-6 w-6', isActive && 'text-primary')} aria-hidden />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
