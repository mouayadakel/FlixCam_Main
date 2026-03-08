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
  cms: { ar: 'إدارة المحتوى', en: 'CMS' },
  bookings: { ar: 'الحجوزات', en: 'Bookings' },
  quotes: { ar: 'عروض الأسعار', en: 'Quotes' },
  calendar: { ar: 'التقويم', en: 'Calendar' },
  inventory: { ar: 'المخزون', en: 'Inventory' },
  equipment: { ar: 'المعدات', en: 'Equipment' },
  categories: { ar: 'الفئات', en: 'Categories' },
  brands: { ar: 'العلامات التجارية', en: 'Brands' },
  studios: { ar: 'مساحات الاستوديو', en: 'Studio Spaces' },
  'cms/studios': { ar: 'محتوى الاستوديو', en: 'Studio Content' },
  invoices: { ar: 'الفواتير', en: 'Invoices' },
  payments: { ar: 'المدفوعات', en: 'Payments' },
  contracts: { ar: 'العقود', en: 'Contracts' },
  'promissory-notes': { ar: 'سندات الأمر', en: 'Promissory Notes' },
  clients: { ar: 'العملاء', en: 'Clients' },
  coupons: { ar: 'الكوبونات', en: 'Coupons' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  integrations: { ar: 'التكاملات', en: 'Integrations' },
  features: { ar: 'الميزات', en: 'Features' },
  roles: { ar: 'الأدوار', en: 'Roles' },
  ai: { ar: 'إعدادات الذكاء الاصطناعي', en: 'AI Settings' },
  'ai-control': { ar: 'إعدادات الذكاء الاصطناعي', en: 'AI Settings' },
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

      // Skip numeric IDs and CUIDs (dynamic route params)
      const isId = /^\d+$/.test(segment) || /^c[a-z0-9]{24}$/i.test(segment)
      if (!isId) {
        const pathSoFar = segments.slice(0, index + 1).join('/')
        const compoundKey = pathSoFar.includes('cms') && segment === 'studios' ? 'cms/studios' : segment
        const label = routeLabels[compoundKey] ?? routeLabels[segment] ?? {
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

  const lastItem = breadcrumbs[breadcrumbs.length - 1]

  return (
    <nav
      className="flex items-center gap-2 text-sm text-neutral-600"
      dir="rtl"
      aria-label="Breadcrumb"
    >
      {/* Mobile: current page name only */}
      <div className="flex items-center gap-2 lg:hidden">
        {breadcrumbs.length > 1 ? (
          <span className="truncate font-medium text-neutral-900">{lastItem?.label[language]}</span>
        ) : (
          <span className="text-neutral-500">{breadcrumbs[0]?.label[language]}</span>
        )}
      </div>
      {/* Desktop: full breadcrumb trail */}
      <div className="hidden lg:flex lg:items-center lg:gap-2">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1
          return (
            <div key={item.href} className="flex items-center gap-2">
              {index === 0 ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1 transition-colors hover:text-primary-600"
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
                    <Link href={item.href} className="transition-colors hover:text-primary-600">
                      {item.label[language]}
                    </Link>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
