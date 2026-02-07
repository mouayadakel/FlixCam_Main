/**
 * @file admin-breadcrumbs.tsx
 * @description Breadcrumb navigation component for admin pages
 * @module components/layouts
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: { ar: string; en: string }
  href: string
}

const routeLabels: Record<string, { ar: string; en: string }> = {
  dashboard: { ar: 'لوحة التحكم', en: 'Dashboard' },
  bookings: { ar: 'الحجوزات', en: 'Bookings' },
  quotes: { ar: 'عروض الأسعار', en: 'Quotes' },
  calendar: { ar: 'التقويم', en: 'Calendar' },
  inventory: { ar: 'المخزون', en: 'Inventory' },
  equipment: { ar: 'المعدات', en: 'Equipment' },
  categories: { ar: 'الفئات', en: 'Categories' },
  brands: { ar: 'العلامات التجارية', en: 'Brands' },
  studios: { ar: 'الاستوديوهات', en: 'Studios' },
  invoices: { ar: 'الفواتير', en: 'Invoices' },
  payments: { ar: 'المدفوعات', en: 'Payments' },
  contracts: { ar: 'العقود', en: 'Contracts' },
  clients: { ar: 'العملاء', en: 'Clients' },
  coupons: { ar: 'الكوبونات', en: 'Coupons' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  integrations: { ar: 'التكاملات', en: 'Integrations' },
  features: { ar: 'الميزات', en: 'Features' },
  roles: { ar: 'الأدوار', en: 'Roles' },
  'ai-control': { ar: 'التحكم بالذكاء الاصطناعي', en: 'AI Control' },
  notifications: { ar: 'الإشعارات', en: 'Notifications' },
}

export function AdminBreadcrumbs() {
  const pathname = usePathname()
  const [language] = useState<'ar' | 'en'>('ar')

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: { ar: 'الرئيسية', en: 'Home' }, href: '/admin/dashboard' },
    ]

    if (!pathname || pathname === '/admin/dashboard') {
      return items
    }

    const segments = pathname.split('/').filter(Boolean)
    
    // Skip 'admin' segment
    if (segments[0] === 'admin') {
      segments.shift()
    }

    let currentPath = '/admin'
    
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      
      // Skip numeric IDs
      if (!/^\d+$/.test(segment)) {
        const label = routeLabels[segment] || {
          ar: segment.replace(/-/g, ' '),
          en: segment.replace(/-/g, ' '),
        }
        
        items.push({
          label,
          href: currentPath,
        })
      }
    })

    return items
  }

  const breadcrumbs = generateBreadcrumbs()

  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-neutral-600" dir="rtl" aria-label="Breadcrumb">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1
        
        return (
          <div key={item.href} className="flex items-center gap-2">
            {index === 0 ? (
              <Link
                href={item.href}
                className="flex items-center gap-1 hover:text-primary-600 transition-colors"
              >
                <Home className="h-4 w-4" />
                <span className="sr-only">{item.label[language]}</span>
              </Link>
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 text-neutral-400" />
                {isLast ? (
                  <span className="font-medium text-neutral-900">{item.label[language]}</span>
                ) : (
                  <Link
                    href={item.href}
                    className="hover:text-primary-600 transition-colors"
                  >
                    {item.label[language]}
                  </Link>
                )}
              </>
            )}
          </div>
        )
      })}
    </nav>
  )
}
