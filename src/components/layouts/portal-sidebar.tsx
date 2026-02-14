/**
 * Portal sidebar – Main, Rentals, Account sections per spec.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Calendar,
  Receipt,
  FolderOpen,
  Heart,
  User,
  Bell,
  HelpCircle,
  Camera,
} from 'lucide-react'

const SECTIONS = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/portal/dashboard', icon: LayoutDashboard },
      { label: 'Browse Equipment', href: '/equipment', icon: Camera },
      { label: 'Packages / Kits', href: '/packages', icon: Package },
      { label: 'Cart', href: '/cart', icon: ShoppingCart },
    ],
  },
  {
    title: 'Rentals',
    items: [
      { label: 'My Bookings', href: '/portal/bookings', icon: Calendar },
      { label: 'Invoices', href: '/portal/invoices', icon: Receipt },
      { label: 'Documents', href: '/portal/documents', icon: FolderOpen },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Saved Gear', href: '/portal/saved', icon: Heart },
      { label: 'Profile & Company', href: '/portal/profile', icon: User },
      { label: 'Notifications', href: '/portal/notifications', icon: Bell },
      { label: 'Support', href: '/support', icon: HelpCircle },
    ],
  },
] as const

export function PortalSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 border-e border-border-light bg-white py-6">
      <nav className="space-y-8 px-3" aria-label="Portal navigation">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
              {section.title}
            </h3>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/equipment' && item.href !== '/cart' && item.href !== '/packages' && item.href !== '/support' && pathname.startsWith(item.href))
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-primary/10 text-brand-primary'
                          : 'text-text-heading hover:bg-surface-light hover:text-brand-primary'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
