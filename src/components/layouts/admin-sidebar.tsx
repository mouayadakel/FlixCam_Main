/**
 * @file admin-sidebar.tsx
 * @description Admin sidebar navigation with 8 main sections (Arabic-first, RTL)
 * @module components/layouts
 * @see /docs/features/admin/Enterprise_Sidebar_Sitemap_Complete.docx for complete structure
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
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
}

const sidebarSections: SidebarSection[] = [
  {
    title: { ar: 'مركز القيادة', en: 'Command Center' },
    icon: Home,
    items: [
      { label: { ar: 'لوحة التحكم', en: 'Dashboard' }, href: '/admin/dashboard', permission: 'dashboard.read' },
      { label: { ar: 'مركز الإجراءات', en: 'Action Center' }, href: '/admin/action-center', permission: 'dashboard.read' },
      { label: { ar: 'الموافقات', en: 'Approvals' }, href: '/admin/approvals', permission: 'approval.read' },
      { label: { ar: 'العمليات الحية', en: 'Live Operations' }, href: '/admin/live-ops', permission: 'dashboard.read' },
    ],
  },
  {
    title: { ar: 'محرك الحجوزات', en: 'Booking Engine' },
    icon: Calendar,
    items: [
      { label: { ar: 'عروض الأسعار', en: 'Quotes' }, href: '/admin/quotes', permission: 'quote.read' },
      { label: { ar: 'الحجوزات', en: 'Bookings' }, href: '/admin/bookings', permission: 'booking.read' },
      { label: { ar: 'تعارضات الحجوزات', en: 'Booking Conflicts' }, href: '/admin/bookings/conflicts', permission: 'booking.read' },
      { label: { ar: 'الاحتياط والتوفر', en: 'Availability & Holds' }, href: '/admin/holds', permission: 'booking.read' },
      { label: { ar: 'الحجوزات المتكررة', en: 'Recurring Bookings' }, href: '/admin/recurring-bookings', permission: 'booking.read' },
      { label: { ar: 'التقويم', en: 'Calendar' }, href: '/admin/calendar', permission: 'booking.read' },
    ],
  },
  {
    title: { ar: 'أدوات البيع الذكية', en: 'Smart Sales Tools' },
    icon: Brain,
    items: [
      { label: { ar: 'ميزات الذكاء الاصطناعي', en: 'AI Features' }, href: '/admin/ai', permission: 'ai.use' },
      { label: { ar: 'منشئ الحزم', en: 'Kit Builder' }, href: '/admin/kit-builder', permission: 'kit.read' },
      { label: { ar: 'أنواع التصوير', en: 'Shoot Types' }, href: '/admin/shoot-types', permission: 'equipment.read' },
      { label: { ar: 'التسعير الديناميكي', en: 'Dynamic Pricing' }, href: '/admin/dynamic-pricing', permission: 'pricing.read' },
      { label: { ar: 'التوصيات الذكية', en: 'AI Recommendations' }, href: '/admin/ai-recommendations', permission: 'ai.use' },
    ],
  },
  {
    title: { ar: 'المخزون والأصول', en: 'Inventory & Assets' },
    icon: Package,
    items: [
      { label: { ar: 'المعدات', en: 'Equipment' }, href: '/admin/inventory/equipment', permission: 'equipment.read' },
      { label: { ar: 'الحزم (المجموعات)', en: 'Kits & Bundles' }, href: '/admin/inventory/kits', permission: 'kit.read' },
      { label: { ar: 'الفئات', en: 'Categories' }, href: '/admin/inventory/categories', permission: 'category.read' },
      { label: { ar: 'العلامات التجارية', en: 'Brands' }, href: '/admin/inventory/brands', permission: 'brand.read' },
      { label: { ar: 'الاستوديوهات', en: 'Studios' }, href: '/admin/studios', permission: 'studio.read' },
      { label: { ar: 'الاستيراد', en: 'Import' }, href: '/admin/inventory/import', permission: 'import.read' },
    ],
  },
  {
    title: { ar: 'العمليات الميدانية', en: 'Field Operations' },
    icon: Wrench,
    items: [
      { label: { ar: 'المستودع', en: 'Warehouse' }, href: '/admin/ops/warehouse', permission: 'warehouse.read' },
      { label: { ar: 'التوصيل', en: 'Delivery' }, href: '/admin/ops/delivery', permission: 'delivery.read' },
      { label: { ar: 'جدولة التوصيل', en: 'Delivery Schedule' }, href: '/admin/ops/delivery/schedule', permission: 'delivery.read' },
      { label: { ar: 'الفنيون', en: 'Technicians' }, href: '/admin/technicians', permission: 'user.read' },
      { label: { ar: 'الصيانة', en: 'Maintenance' }, href: '/admin/maintenance', permission: 'maintenance.read' },
      { label: { ar: 'مطالبات الأضرار', en: 'Damage Claims' }, href: '/admin/damage-claims', permission: 'booking.read' },
    ],
  },
  {
    title: { ar: 'المالية والقانونية', en: 'Finance & Legal' },
    icon: DollarSign,
    items: [
      { label: { ar: 'الفواتير', en: 'Invoices' }, href: '/admin/invoices', permission: 'invoice.read' },
      { label: { ar: 'المدفوعات', en: 'Payments' }, href: '/admin/payments', permission: 'payment.read' },
      { label: { ar: 'العربون', en: 'Deposits' }, href: '/admin/finance/deposits', permission: 'payment.read' },
      { label: { ar: 'الاستردادات', en: 'Refunds' }, href: '/admin/finance/refunds', permission: 'payment.read' },
      { label: { ar: 'العقود', en: 'Contracts' }, href: '/admin/contracts', permission: 'contract.read' },
      { label: { ar: 'التقارير المالية', en: 'Financial Reports' }, href: '/admin/finance/reports', permission: 'reports.read_financial' },
      { label: { ar: 'التحليلات والإشغال', en: 'Analytics & Utilization' }, href: '/admin/analytics', permission: 'dashboard.analytics' },
    ],
  },
  {
    title: { ar: 'الموردون', en: 'Vendors' },
    icon: Store,
    items: [
      { label: { ar: 'الموردون', en: 'Vendors' }, href: '/admin/vendors', permission: 'vendor.read' },
      { label: { ar: 'المدفوعات للموردين', en: 'Vendor Payouts' }, href: '/admin/vendors/payouts', permission: 'vendor.manage_payouts' },
    ],
  },
  {
    title: { ar: 'العملاء والتسويق', en: 'CRM & Marketing' },
    icon: Users,
    items: [
      { label: { ar: 'العملاء', en: 'Clients' }, href: '/admin/clients', permission: 'client.read' },
      { label: { ar: 'التقييمات', en: 'Reviews' }, href: '/admin/reviews', permission: 'client.read' },
      { label: { ar: 'شرائح العملاء', en: 'Customer Segments' }, href: '/admin/settings/customer-segments', permission: 'client.read' },
      { label: { ar: 'الكوبونات والخصومات', en: 'Coupons & Discounts' }, href: '/admin/coupons', permission: 'coupon.read' },
      { label: { ar: 'التسويق', en: 'Marketing' }, href: '/admin/marketing', permission: 'marketing.read' },
    ],
  },
  {
    title: { ar: 'الإعدادات', en: 'Settings' },
    icon: Settings,
    items: [
      { label: { ar: 'الإعدادات العامة', en: 'General Settings' }, href: '/admin/settings', permission: 'settings.read' },
      { label: { ar: 'المستخدمون', en: 'Users' }, href: '/admin/users', permission: 'user.read' },
      { label: { ar: 'قوالب الإشعارات', en: 'Notification Templates' }, href: '/admin/settings/notification-templates', permission: 'settings.read' },
      { label: { ar: 'التكاملات', en: 'Integrations' }, href: '/admin/settings/integrations', permission: 'settings.read' },
      { label: { ar: 'الميزات', en: 'Features' }, href: '/admin/settings/features', permission: 'settings.update' },
      { label: { ar: 'الأدوار', en: 'Roles' }, href: '/admin/settings/roles', permission: 'settings.manage_roles' },
      { label: { ar: 'التحكم بالذكاء الاصطناعي', en: 'AI Control' }, href: '/admin/settings/ai-control', permission: 'settings.update' },
      { label: { ar: 'سجل التدقيق', en: 'Audit Log' }, href: '/admin/settings/audit-log', permission: 'audit.read' },
      { label: { ar: 'الفروع', en: 'Branches' }, href: '/admin/settings/branches', permission: 'settings.read' },
      { label: { ar: 'مناطق التوصيل', en: 'Delivery Zones' }, href: '/admin/settings/delivery-zones', permission: 'settings.read' },
      { label: { ar: 'الضريبة / ض.ق.م', en: 'Tax / VAT' }, href: '/admin/settings/tax', permission: 'settings.read' },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { hasPermission, loading, error } = usePermissions()
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

  // Auto-expand section if current path matches
  useEffect(() => {
    sidebarSections.forEach((section) => {
      const hasActiveItem = section.items.some((item) => 
        pathname === item.href || pathname?.startsWith(item.href + '/')
      )
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
          'fixed right-0 top-0 z-50 flex h-screen flex-col border-l border-neutral-200 bg-white shadow-lg transition-transform duration-300 lg:relative lg:translate-x-0',
          collapsed ? 'translate-x-full lg:translate-x-0 lg:w-16' : 'translate-x-0 w-64'
        )}
        dir="rtl"
      >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4">
        {!collapsed && (
          <h1 className="text-xl font-bold text-primary-600">نظام التأجير</h1>
        )}
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
          <div className="flex flex-col items-center justify-center py-12 gap-3" dir="rtl">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            <span className="text-sm text-neutral-500">جاري التحميل...</span>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4" dir="rtl">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800">خطأ</p>
                <p className="text-red-700">فشل تحميل الصلاحيات. يرجى تحديث الصفحة.</p>
              </div>
            </div>
          </div>
        ) : (
        sidebarSections.map((section) => {
          const filteredItems = section.items.filter((item) => hasPermission(item.permission))
          if (filteredItems.length === 0) return null
          const isExpanded = expandedSections.includes(section.title.ar)
          const hasActiveItem = filteredItems.some((item) => isActive(item.href))

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
                    <span className="flex-1 text-right">{section.title[language]}</span>
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
                <ul className="mr-4 space-y-1 border-r-2 border-neutral-100 pr-2">
                  {filteredItems.map((item) => {
                    const active = isActive(item.href)
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'block rounded-lg px-3 py-2 text-sm transition-colors',
                            active
                              ? 'bg-primary-100 text-primary-700 font-medium'
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
            <span className="text-sm">
              {language === 'ar' ? 'English' : 'العربية'}
            </span>
          </Button>
        </div>
      )}
    </aside>
    </>
  )
}
