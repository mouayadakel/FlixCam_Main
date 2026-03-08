/**
 * @file admin-sidebar.tsx
 * @description Admin sidebar navigation — 36 standardized items across 10 sections (Arabic-first, RTL)
 * Tabs and modals are handled inside parent pages; sidebar shows main navigable pages only.
 * @module components/layouts
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
import { useAdminFeatureFlags } from '@/lib/hooks/use-admin-feature-flags'
import { ADMIN_SIDEBAR_FLAG_MAP } from '@/config/feature-flag-groups'
import {
  Home,
  Calendar,
  Brain,
  Package,
  Store,
  Wrench,
  DollarSign,
  Users,
  Settings,
  Layout,
  Newspaper,
  ChevronDown,
  ChevronLeft,
  Menu,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SidebarSection {
  title: { ar: string; en: string }
  icon: React.ComponentType<{ className?: string }>
  items: SidebarItem[]
}

interface SidebarItem {
  label: { ar: string; en: string }
  href: string
  permission?: string
  /** Routes that belong to this parent (for active state when on tab/modal route) */
  activePaths?: string[]
}

const sidebarSections: SidebarSection[] = [
  {
    title: { ar: 'مركز القيادة', en: 'Command Center' },
    icon: Home,
    items: [
      { label: { ar: 'لوحة التحكم', en: 'Dashboard' }, href: '/admin/dashboard', permission: 'dashboard.read' },
      { label: { ar: 'مركز الإجراءات', en: 'Action Center' }, href: '/admin/action-center', permission: 'dashboard.read', activePaths: ['/admin/action-center', '/admin/approvals', '/admin/notifications'] },
      { label: { ar: 'العمليات الحية', en: 'Live Operations' }, href: '/admin/live-ops', permission: 'dashboard.read' },
    ],
  },
  {
    title: { ar: 'محرك الحجوزات', en: 'Booking Engine' },
    icon: Calendar,
    items: [
      { label: { ar: 'الحجوزات', en: 'Bookings' }, href: '/admin/bookings', permission: 'booking.read', activePaths: ['/admin/bookings', '/admin/bookings/conflicts', '/admin/holds', '/admin/orders'] },
      { label: { ar: 'عروض الأسعار', en: 'Quotes' }, href: '/admin/quotes', permission: 'quote.read' },
      { label: { ar: 'الحجوزات المتكررة', en: 'Recurring Bookings' }, href: '/admin/recurring-bookings', permission: 'booking.read' },
      { label: { ar: 'التقويم', en: 'Calendar' }, href: '/admin/calendar', permission: 'booking.read' },
    ],
  },
  {
    title: { ar: 'أدوات المبيعات', en: 'Sales Tools' },
    icon: Brain,
    items: [
      { label: { ar: 'لوحة الذكاء الاصطناعي', en: 'AI Dashboard' }, href: '/admin/ai-dashboard', permission: 'ai.use', activePaths: ['/admin/ai-dashboard', '/admin/ai-recommendations', '/admin/ai'] },
      { label: { ar: 'منشئ الحزم', en: 'Kit Builder' }, href: '/admin/kit-builder', permission: 'kit.read' },
      { label: { ar: 'التسعير الديناميكي', en: 'Dynamic Pricing' }, href: '/admin/dynamic-pricing', permission: 'pricing.read' },
      { label: { ar: 'أنواع التصوير', en: 'Shoot Types' }, href: '/admin/shoot-types', permission: 'equipment.read' },
    ],
  },
  {
    title: { ar: 'المخزون', en: 'Inventory' },
    icon: Package,
    items: [
      { label: { ar: 'المعدات', en: 'Equipment' }, href: '/admin/inventory/equipment', permission: 'equipment.read', activePaths: ['/admin/inventory', '/admin/inventory/equipment', '/admin/inventory/featured', '/admin/inventory/categories', '/admin/inventory/brands', '/admin/inventory/content-review', '/admin/inventory/products'] },
      { label: { ar: 'الحزم', en: 'Kits & Bundles' }, href: '/admin/inventory/kits', permission: 'kit.read' },
      { label: { ar: 'الاستوديو', en: 'Studios' }, href: '/admin/studios', permission: 'studio.read' },
      { label: { ar: 'الاستيراد', en: 'Import' }, href: '/admin/inventory/import', permission: 'import.read' },
      { label: { ar: 'حالة الذكاء الاصطناعي', en: 'AI Status' }, href: '/admin/inventory/ai-status', permission: 'equipment.read', activePaths: ['/admin/inventory/ai-status'] },
    ],
  },
  {
    title: { ar: 'العمليات الميدانية', en: 'Field Operations' },
    icon: Wrench,
    items: [
      { label: { ar: 'المستودع', en: 'Warehouse' }, href: '/admin/ops/warehouse', permission: 'warehouse.read', activePaths: ['/admin/ops/warehouse', '/admin/ops/warehouse/check-in', '/admin/ops/warehouse/check-out', '/admin/ops/warehouse/inventory'] },
      { label: { ar: 'التوصيل', en: 'Delivery' }, href: '/admin/ops/delivery', permission: 'delivery.read', activePaths: ['/admin/ops/delivery', '/admin/ops/delivery/schedule'] },
      { label: { ar: 'الفنيون', en: 'Technicians' }, href: '/admin/technicians', permission: 'user.read' },
      { label: { ar: 'الصيانة والأضرار', en: 'Maintenance & Damage' }, href: '/admin/maintenance', permission: 'maintenance.read', activePaths: ['/admin/maintenance', '/admin/damage-claims'] },
    ],
  },
  {
    title: { ar: 'المالية والقانونية', en: 'Finance & Legal' },
    icon: DollarSign,
    items: [
      { label: { ar: 'الفواتير', en: 'Invoices' }, href: '/admin/invoices', permission: 'invoice.read' },
      { label: { ar: 'المدفوعات', en: 'Payments' }, href: '/admin/payments', permission: 'payment.read', activePaths: ['/admin/payments', '/admin/wallet', '/admin/finance/deposits', '/admin/finance/refunds'] },
      { label: { ar: 'العقود', en: 'Contracts' }, href: '/admin/contracts', permission: 'contract.read' },
      { label: { ar: 'سندات الأمر', en: 'Promissory Notes' }, href: '/admin/promissory-notes', permission: 'settings.read' },
      { label: { ar: 'التقارير والتحليلات', en: 'Reports & Analytics' }, href: '/admin/finance/reports', permission: 'reports.read_financial', activePaths: ['/admin/finance', '/admin/finance/reports', '/admin/reports', '/admin/analytics'] },
    ],
  },
  {
    title: { ar: 'الموردون', en: 'Vendors' },
    icon: Store,
    items: [
      { label: { ar: 'الموردون', en: 'Vendors' }, href: '/admin/vendors', permission: 'vendor.read', activePaths: ['/admin/vendors', '/admin/vendors/payouts'] },
    ],
  },
  {
    title: { ar: 'العملاء والتسويق', en: 'CRM & Marketing' },
    icon: Users,
    items: [
      { label: { ar: 'العملاء', en: 'Clients' }, href: '/admin/clients', permission: 'client.read', activePaths: ['/admin/clients', '/admin/reviews', '/admin/settings/customer-segments'] },
      { label: { ar: 'الكوبونات والخصومات', en: 'Coupons & Discounts' }, href: '/admin/coupons', permission: 'coupon.read', activePaths: ['/admin/coupons', '/admin/discounts'] },
      { label: { ar: 'التسويق', en: 'Marketing' }, href: '/admin/marketing', permission: 'marketing.read' },
    ],
  },
  {
    title: { ar: 'إدارة المحتوى', en: 'Content' },
    icon: Layout,
    items: [
      { label: { ar: 'المحتوى', en: 'CMS' }, href: '/admin/cms', permission: 'settings.update', activePaths: ['/admin/cms', '/admin/cms/faq', '/admin/cms/policies', '/admin/cms/featured', '/admin/cms/checkout-form', '/admin/cms/footer'] },
      { label: { ar: 'الفوتر', en: 'Footer' }, href: '/admin/cms/footer', permission: 'settings.update', activePaths: ['/admin/cms/footer'] },
      { label: { ar: 'محتوى الاستوديو', en: 'Studios CMS' }, href: '/admin/cms/studios', permission: 'cms.studio.read' },
      { label: { ar: 'مركز الرسائل', en: 'Messaging Center' }, href: '/admin/cms/messaging-center', permission: 'settings.read' },
      { label: { ar: 'البانر الرئيسي', en: 'Hero Banners' }, href: '/admin/settings/hero-banners', permission: 'settings.update', activePaths: ['/admin/settings/hero-banners'] },
    ],
  },
  {
    title: { ar: 'المدونة | Blog', en: 'Blog' },
    icon: Newspaper,
    items: [
      { label: { ar: 'المقالات', en: 'Posts' }, href: '/admin/blog', permission: 'settings.read', activePaths: ['/admin/blog', '/admin/blog/new', '/admin/blog/edit'] },
      { label: { ar: 'التصنيفات', en: 'Categories' }, href: '/admin/blog/categories', permission: 'settings.read' },
      { label: { ar: 'المؤلفون', en: 'Authors' }, href: '/admin/blog/authors', permission: 'settings.read' },
      { label: { ar: 'التقويم', en: 'Calendar' }, href: '/admin/blog/calendar', permission: 'settings.read' },
      { label: { ar: 'التحليلات', en: 'Analytics' }, href: '/admin/blog/analytics', permission: 'settings.read' },
    ],
  },
  {
    title: { ar: 'الإعدادات', en: 'Settings' },
    icon: Settings,
    items: [
      { label: { ar: 'عام', en: 'General' }, href: '/admin/settings', permission: 'settings.read', activePaths: ['/admin/settings', '/admin/settings/company', '/admin/settings/branches', '/admin/settings/tax', '/admin/settings/features', '/admin/settings/policies', '/admin/translations', '/admin/ai-translations'] },
      { label: { ar: 'المستخدمون والأدوار', en: 'Users & Roles' }, href: '/admin/users', permission: 'user.read', activePaths: ['/admin/users', '/admin/settings/roles', '/admin/settings/audit-log'] },
      { label: { ar: 'الدفع والتوصيل', en: 'Payment & Delivery' }, href: '/admin/settings/checkout', permission: 'settings.read', activePaths: ['/admin/settings/checkout', '/admin/settings/otp-payment', '/admin/settings/delivery-zones', '/admin/settings/payment-gateways'] },
      { label: { ar: 'الموقع', en: 'Website' }, href: '/admin/settings/website-pages', permission: 'settings.read', activePaths: ['/admin/settings/website-pages', '/admin/settings/hero-banners', '/admin/settings/notification-templates', '/admin/settings/promissory-note'] },
      { label: { ar: 'التكاملات والذكاء الاصطناعي', en: 'Integrations & AI' }, href: '/admin/settings/integrations', permission: 'settings.read', activePaths: ['/admin/settings/integrations', '/admin/settings/ai', '/admin/settings/ai-control'] },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { hasPermission, loading, error } = usePermissions()
  const { flags: featureFlags, loading: flagsLoading } = useAdminFeatureFlags()

  const isItemVisibleByFlag = (href: string): boolean => {
    const flagName = ADMIN_SIDEBAR_FLAG_MAP[href]
    if (!flagName) return true
    if (flagsLoading) return true
    return !!featureFlags[flagName]
  }
  const [collapsed, setCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [language, setLanguage] = useState<'ar' | 'en'>('ar')
  // Listen for mobile toggle events from header
  useEffect(() => {
    const handleToggle = () => {
      setCollapsed((prev) => !prev)
    }

    const eventListener = () => handleToggle()
    window.addEventListener('toggle-sidebar', eventListener)

    return () => {
      window.removeEventListener('toggle-sidebar', eventListener)
    }
  }, [])

  const isItemOrChildActive = (item: SidebarItem): boolean => {
    if (isActive(item.href)) return true
    if (item.activePaths) {
      return item.activePaths.some((p) => pathname === p || pathname?.startsWith(p + '/'))
    }
    return false
  }

  // Auto-expand section if current path matches (including nested children)
  useEffect(() => {
    sidebarSections.forEach((section) => {
      const hasActiveItem = section.items.some((item) => isItemOrChildActive(item))
      if (hasActiveItem && !expandedSections.includes(section.title.ar)) {
        setExpandedSections((prev) => [...prev, section.title.ar])
      }
    })
  }, [pathname, expandedSections])

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionTitle)
        ? prev.filter((title) => title !== sectionTitle)
        : [...prev, sectionTitle]
    )
  }

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/')
  }

  return (
    <>
      {/* Mobile Overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setCollapsed(true)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed end-0 top-0 z-50 flex h-screen flex-col border-s border-neutral-200 bg-white shadow-lg transition-transform duration-300 lg:relative lg:translate-x-0',
          collapsed
            ? 'translate-x-full lg:w-16 lg:translate-x-0'
            : 'w-[80vw] max-w-[320px] translate-x-0 lg:w-64'
        )}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4">
          {!collapsed && <h1 className="text-xl font-bold text-primary-600">نظام التأجير</h1>}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12" dir="rtl">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
              <span className="text-sm text-neutral-500">جاري التحميل...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4" dir="rtl">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <div className="text-sm">
                  <p className="font-medium text-red-800">خطأ</p>
                  <p className="text-red-700">فشل تحميل الصلاحيات. يرجى تحديث الصفحة.</p>
                </div>
              </div>
            </div>
          ) : (
            sidebarSections.map((section) => {
              const filteredItems = section.items.filter((item) => {
                if (!hasPermission(item.permission)) return false
                return isItemVisibleByFlag(item.href)
              })
              if (filteredItems.length === 0) return null
              const isExpanded = expandedSections.includes(section.title.ar)
              const hasActiveItem = filteredItems.some((item) => isItemOrChildActive(item))

              return (
                <div key={section.title.ar} className="space-y-1">
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.title.ar)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                      hasActiveItem
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-600 hover:bg-neutral-50'
                    )}
                  >
                    <section.icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-end">{section.title[language]}</span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronLeft className="h-4 w-4" />
                        )}
                      </>
                    )}
                  </button>

                  {/* Section Items */}
                  {!collapsed && isExpanded && (
                    <ul className="me-4 space-y-1 border-e-2 border-neutral-100 pe-2">
                      {filteredItems.map((item) => {
                        const active = isActive(item.href) || isItemOrChildActive(item)
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={cn(
                                'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                active
                                  ? 'bg-primary-100 text-primary-700'
                                  : 'text-neutral-700 hover:bg-neutral-50'
                              )}
                            >
                              {item.label[language]}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })
          )}
        </nav>

        {/* Footer - Language Toggle */}
        {!collapsed && (
          <div className="border-t border-neutral-200 p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="w-full justify-start"
            >
              <span className="text-sm">{language === 'ar' ? 'English' : 'العربية'}</span>
            </Button>
          </div>
        )}
      </aside>
    </>
  )
}
