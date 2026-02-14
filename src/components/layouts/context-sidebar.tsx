/**
 * @file context-sidebar.tsx
 * @description Context sidebar for admin dashboard (second sidebar)
 * @module components/layouts
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { matchesPermission } from '@/lib/auth/matches-permission'
import {
  Package,
  Camera,
  FolderTree,
  Calendar,
  DollarSign,
  Settings,
  Flag,
  Plug,
  Shield,
  LayoutDashboard,
  BarChart3,
  List,
  Activity,
  Zap,
  ShoppingCart,
  Users,
  FileText,
  Wallet,
  Percent,
  Building2,
  Wrench,
  Upload,
  Sparkles,
} from 'lucide-react'

interface ContextNavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
}

// Context navigation items grouped by section
const contextNavConfig: Record<string, ContextNavItem[]> = {
  dashboard: [
    {
      label: 'Overview',
      href: '/admin/dashboard#overview',
      icon: LayoutDashboard,
    },
    {
      label: 'Revenue',
      href: '/admin/dashboard#revenue',
      icon: BarChart3,
    },
    {
      label: 'Recent Bookings',
      href: '/admin/dashboard#recent-bookings',
      icon: List,
    },
    {
      label: 'Activity',
      href: '/admin/dashboard#recent-activity',
      icon: Activity,
    },
    {
      label: 'Quick Actions',
      href: '/admin/dashboard#quick-actions',
      icon: Zap,
    },
  ],
  sales: [
    {
      label: 'Bookings',
      href: '/admin/bookings',
      icon: ShoppingCart,
      permission: 'booking.read',
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: Users,
      permission: 'user.read',
    },
    {
      label: 'Invoices',
      href: '/admin/invoices',
      icon: FileText,
      permission: 'invoice.read',
    },
    {
      label: 'Wallet',
      href: '/admin/wallet',
      icon: Wallet,
      permission: 'payment.read',
    },
    {
      label: 'Calendar',
      href: '/admin/calendar',
      icon: Calendar,
      permission: 'booking.read',
    },
  ],
  inventory: [
    {
      label: 'Equipment',
      href: '/admin/inventory/equipment',
      icon: Camera,
      permission: 'equipment.read',
    },
    {
      label: 'Categories',
      href: '/admin/inventory/categories',
      icon: FolderTree,
      permission: 'equipment.read',
    },
    {
      label: 'Import',
      href: '/admin/inventory/import',
      icon: Upload,
      permission: 'equipment.create',
    },
    {
      label: 'Studios',
      href: '/admin/studios',
      icon: Building2,
      permission: 'studio.read',
    },
    {
      label: 'Technicians',
      href: '/admin/technicians',
      icon: Wrench,
      permission: 'user.read',
    },
  ],
  settings: [
    {
      label: 'Features',
      href: '/admin/settings/features',
      icon: Flag,
      permission: 'settings.read',
    },
    {
      label: 'Integrations',
      href: '/admin/settings/integrations',
      icon: Plug,
      permission: 'settings.read',
    },
    {
      label: 'Roles',
      href: '/admin/settings/roles',
      icon: Shield,
      permission: 'settings.manage_roles',
    },
    {
      label: 'AI Control',
      href: '/admin/settings/ai-control',
      icon: Sparkles,
      permission: 'settings.read',
    },
  ],
  bookings: [
    {
      label: 'All Bookings',
      href: '/admin/bookings',
      icon: Calendar,
      permission: 'booking.read',
    },
  ],
  finance: [
    {
      label: 'Payments',
      href: '/admin/finance',
      icon: DollarSign,
      permission: 'payment.read',
    },
  ],
  marketing: [
    {
      label: 'Coupons',
      href: '/admin/coupons',
      icon: Percent,
      permission: 'coupon.read',
    },
  ],
}

export function ContextSidebar() {
  const pathname = usePathname()
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch user permissions
    fetch('/api/user/permissions')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        if (data && Array.isArray(data.permissions)) {
          setPermissions(data.permissions)
        } else {
          setPermissions([])
        }
      })
      .catch(() => {
        // If fetch fails, show all items (fallback)
        setPermissions([])
      })
      .finally(() => setLoading(false))
  }, [])

  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true
    // If no permissions loaded yet, show item (will be filtered after load)
    if (loading) return true
    // If permissions array is empty, show all (fallback for admin or if API fails)
    if (permissions.length === 0) return true
    return permissions.some((p) => matchesPermission(p, permission))
  }

  // Determine which context section to show based on current path
  const getContextSection = (): string | null => {
    if (pathname === '/admin/dashboard' || pathname?.startsWith('/admin/dashboard')) return 'dashboard'
    if (
      pathname?.startsWith('/admin/users') ||
      pathname?.startsWith('/admin/invoices') ||
      pathname?.startsWith('/admin/wallet') ||
      pathname?.startsWith('/admin/calendar')
    ) return 'sales'
    if (
      pathname?.startsWith('/admin/inventory') ||
      pathname?.startsWith('/admin/studios') ||
      pathname?.startsWith('/admin/technicians')
    ) return 'inventory'
    if (pathname?.startsWith('/admin/settings')) return 'settings'
    if (pathname?.startsWith('/admin/bookings')) return 'bookings'
    if (pathname?.startsWith('/admin/finance')) return 'finance'
    if (pathname?.startsWith('/admin/coupons')) return 'marketing'
    return null
  }

  const contextSection = getContextSection()
  const allNavItems = contextSection ? contextNavConfig[contextSection] || [] : []
  
  // Filter nav items by permissions
  const navItems = allNavItems.filter((item) => hasPermission(item.permission))

  if (!contextSection || navItems.length === 0) {
    return null
  }

  const isActive = (href: string) => {
    const baseHref = href.split('#')[0]
    return pathname === baseHref || pathname?.startsWith(baseHref + '/')
  }

  const sectionLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    sales: 'Sales',
    inventory: 'Inventory',
    settings: 'Settings',
    bookings: 'Bookings',
    finance: 'Finance',
    marketing: 'Marketing',
  }

  return (
    <aside className="hidden lg:flex w-56 flex-col border-r bg-muted/30">
      <div className="flex h-16 items-center border-b px-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {sectionLabels[contextSection] || contextSection}
        </h3>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
