'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  BarChart3, 
  Megaphone, 
  Search, 
  Tag, 
  Share2,
  Mail, 
  ChevronLeft,
  Users,
  Zap,
  Settings,
  History,
  Split,
  Gift,
  Smile,
  Package,
  DollarSign,
  Users2,
  Crown,
  Network,
  LayoutDashboard
} from 'lucide-react'

const navItems = [
  {
    title: 'لوحة التحكم',
    isActive: (pathname: string) => pathname === '/admin/marketing/command-center',
    href: '/admin/marketing/command-center',
    icon: LayoutDashboard,
  },
  {
    title: 'نظرة عامة',
    isActive: (pathname: string) => pathname === '/admin/marketing',
    href: '/admin/marketing',
    icon: BarChart3,
  },
  {
    title: 'العملاء',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/leads'),
    href: '/admin/marketing/leads',
    icon: Users,
  },
  {
    title: 'مسارات العملاء',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/journeys'),
    href: '/admin/marketing/journeys',
    icon: History,
  },
  {
    title: 'الاحتفاظ بالعملاء',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/retention'),
    href: '/admin/marketing/retention',
    icon: Smile,
  },
  {
    title: 'اختبارات A/B',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/ab-testing'),
    href: '/admin/marketing/ab-testing',
    icon: Split,
  },
  {
    title: 'الإحالات',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/referrals'),
    href: '/admin/marketing/referrals',
    icon: Gift,
  },
  {
    title: 'الاستراتيجية',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/strategy'),
    href: '/admin/marketing/strategy',
    icon: Zap,
  },
  {
    title: 'الإعدادات',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/settings'),
    href: '/admin/marketing/settings',
    icon: Settings,
  },
  {
    title: 'المخزون',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/inventory'),
    href: '/admin/marketing/inventory',
    icon: Package,
  },
  {
    title: 'الأتمتة',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/automations'),
    href: '/admin/marketing/automations',
    icon: Zap,
  },
  {
    title: 'الحملات',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/campaigns'),
    href: '/admin/marketing/campaigns',
    icon: Megaphone,
  },
  {
    title: 'SEO',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/seo'),
    href: '/admin/marketing/seo',
    icon: Search,
  },
  {
    title: 'البكسلات',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/pixels'),
    href: '/admin/marketing/pixels',
    icon: Tag,
  },
  {
    title: 'التواصل',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/social'),
    href: '/admin/marketing/social',
    icon: Share2,
  },
  {
    title: 'البريد',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/email'),
    href: '/admin/marketing/email',
    icon: Mail,
  },
  {
    title: 'الميزانية',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/budget'),
    href: '/admin/marketing/budget',
    icon: DollarSign,
  },
  {
    title: 'المنافسون',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/competitor'),
    href: '/admin/marketing/competitor',
    icon: Users2,
  },
  {
    title: 'التحليلات',
    isActive: (pathname: string) => pathname === '/admin/marketing/analytics',
    href: '/admin/marketing/analytics',
    icon: Network,
  },
  {
    title: 'العزو',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/attribution'),
    href: '/admin/marketing/attribution',
    icon: Network,
  },
  {
    title: 'التوقعات',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/forecasting'),
    href: '/admin/marketing/forecasting',
    icon: BarChart3,
  },
  {
    title: 'نخبة العملاء',
    isActive: (pathname: string) => pathname.startsWith('/admin/marketing/vip'),
    href: '/admin/marketing/vip',
    icon: Crown,
  },
]

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col space-y-6">
      {/* Unified Marketing Navigation */}
      <div className="flex items-center justify-between border-b pb-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 md:gap-2">
          {navItems.map((item) => {
            const active = item.isActive(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                  active 
                    ? "bg-brand-primary/10 text-brand-primary shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", active ? "text-brand-primary" : "text-muted-foreground")} />
                {item.title}
              </Link>
            )
          })}
        </div>
        
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-dashed">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          مركز التسويق الموحد (Marketing Suite)
        </div>
      </div>

      <div className="min-h-[600px]">
        {children}
      </div>
    </div>
  )
}
