/**
 * @file protected-route.tsx
 * @description Route protection by permission - shows 403 if user lacks permission
 * @module components/auth
 * @see RBAC_IMPLEMENTATION_PLAN.md
 */

'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'
import { cn } from '@/lib/utils'

/**
 * Route to required permission mapping (path prefix -> permission)
 */
export const ROUTE_PERMISSIONS: Record<string, string> = {
  '/admin/dashboard': 'dashboard.read',
  '/admin/profile': 'dashboard.read',
  '/admin/notifications': 'dashboard.read',
  '/admin/action-center': 'dashboard.read',
  '/admin/approvals': 'approval.read',
  '/admin/live-ops': 'dashboard.read',
  '/admin/quotes': 'quote.read',
  '/admin/bookings': 'booking.read',
  '/admin/bookings/conflicts': 'booking.read',
  '/admin/holds': 'booking.read',
  '/admin/recurring-bookings': 'booking.read',
  '/admin/calendar': 'booking.read',
  '/admin/ai': 'ai.use',
  '/admin/kit-builder': 'kit.read',
  '/admin/dynamic-pricing': 'pricing.read',
  '/admin/ai-recommendations': 'ai.use',
  '/admin/inventory/equipment': 'equipment.read',
  '/admin/inventory/kits': 'kit.read',
  '/admin/inventory/categories': 'category.read',
  '/admin/inventory/brands': 'brand.read',
  '/admin/studios': 'studio.read',
  '/admin/inventory/import': 'import.read',
  '/admin/ops/warehouse': 'warehouse.read',
  '/admin/ops/delivery': 'delivery.read',
  '/admin/ops/delivery/schedule': 'delivery.read',
  '/admin/technicians': 'user.read',
  '/admin/maintenance': 'maintenance.read',
  '/admin/damage-claims': 'booking.read',
  '/admin/invoices': 'invoice.read',
  '/admin/payments': 'payment.read',
  '/admin/contracts': 'contract.read',
  '/admin/finance/reports': 'reports.read_financial',
  '/admin/analytics': 'dashboard.analytics',
  '/admin/finance': 'payment.read',
  '/admin/finance/deposits': 'payment.read',
  '/admin/finance/refunds': 'payment.read',
  '/admin/discounts': 'coupon.read',
  '/admin/clients': 'client.read',
  '/admin/reviews': 'client.read',
  '/admin/coupons': 'coupon.read',
  '/admin/marketing': 'marketing.read',
  '/admin/settings': 'settings.read',
  '/admin/settings/roles': 'settings.manage_roles',
  '/admin/settings/features': 'settings.update',
  '/admin/settings/integrations': 'settings.read',
  '/admin/settings/notification-templates': 'settings.read',
  '/admin/settings/customer-segments': 'client.read',
  '/admin/settings/ai-control': 'settings.update',
  '/admin/settings/audit-log': 'audit.read',
  '/admin/settings/branches': 'settings.read',
  '/admin/settings/delivery-zones': 'settings.read',
  '/admin/settings/tax': 'settings.read',
  '/admin/users': 'user.read',
  '/admin/users/new': 'user.create',
  '/admin/orders': 'booking.read',
  '/admin/wallet': 'payment.read',
  '/admin/super': 'system.read_only_mode',
}

function getRequiredPermission(pathname: string | null): string | null {
  if (!pathname || !pathname.startsWith('/admin')) return null
  const sorted = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length)
  for (const path of sorted) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return ROUTE_PERMISSIONS[path]
    }
  }
  return 'dashboard.read'
}

interface ProtectedRouteProps {
  children: React.ReactNode
  permission?: string
  className?: string
}

/**
 * Protects children by permission. When used with permission prop, uses that.
 * When used without, infers from current pathname via ROUTE_PERMISSIONS.
 */
export function ProtectedRoute({ children, permission, className }: ProtectedRouteProps) {
  const pathname = usePathname()
  const { hasPermission, loading } = usePermissions()
  const required = permission ?? getRequiredPermission(pathname)

  if (loading) {
    return <div className={cn('animate-pulse bg-muted/50 rounded-lg h-32', className)} />
  }

  if (!required || hasPermission(required)) {
    return <>{children}</>
  }

  return (
    <div className={cn('flex flex-col items-center justify-center min-h-[300px] gap-4', className)} dir="rtl">
      <ShieldX className="h-16 w-16 text-destructive" />
      <h2 className="text-xl font-semibold">غير مصرح</h2>
      <p className="text-muted-foreground text-center">
        ليس لديك صلاحية الوصول إلى هذه الصفحة. المطلوب: {required}
      </p>
      <Button variant="outline" asChild>
        <Link href="/admin/dashboard">العودة للوحة التحكم</Link>
      </Button>
    </div>
  )
}
