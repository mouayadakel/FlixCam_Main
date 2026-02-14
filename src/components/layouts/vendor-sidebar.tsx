/**
 * Vendor sidebar – Overview, Equipment, Rentals, Finance, Account sections.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  Calendar,
  DollarSign,
  Wallet,
  User,
} from 'lucide-react'

const SECTIONS = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', href: '/vendor/dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Equipment',
    items: [
      { label: 'My Equipment', href: '/vendor/equipment', icon: Package },
      { label: 'Submit New Listing', href: '/vendor/equipment/new', icon: PlusCircle },
    ],
  },
  {
    title: 'Rentals',
    items: [{ label: 'Bookings with My Gear', href: '/vendor/bookings', icon: Calendar }],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Earnings', href: '/vendor/earnings', icon: DollarSign },
      { label: 'Payouts', href: '/vendor/payouts', icon: Wallet },
    ],
  },
  {
    title: 'Account',
    items: [{ label: 'Profile & Bank Info', href: '/vendor/profile', icon: User }],
  },
] as const

export function VendorSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 border-e border-border-light bg-white py-6">
      <nav className="space-y-8 px-3" aria-label="Vendor navigation">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
              {section.title}
            </h3>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/')
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
