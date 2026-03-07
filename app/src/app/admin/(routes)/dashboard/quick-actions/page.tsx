/**
 * @file quick-actions page
 * @description Shortcuts for frequent admin tasks
 * @module app/admin/(routes)/dashboard/quick-actions
 */

'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  FileText,
  FileCheck,
  Package,
  DollarSign,
  ClipboardCheck,
  Users,
  Settings,
} from 'lucide-react'

const ACTIONS = [
  { href: '/admin/bookings/new', label: 'حجز جديد', icon: Calendar },
  { href: '/admin/quotes/new', label: 'عرض سعر جديد', icon: FileText },
  { href: '/admin/invoices', label: 'الفواتير', icon: FileCheck },
  { href: '/admin/equipment', label: 'المعدات', icon: Package },
  { href: '/admin/payments', label: 'المدفوعات', icon: DollarSign },
  { href: '/admin/approvals', label: 'الموافقات', icon: ClipboardCheck },
  { href: '/admin/users', label: 'المستخدمون', icon: Users },
  { href: '/admin/settings', label: 'الإعدادات', icon: Settings },
]

export default function DashboardQuickActionsPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold">إجراءات سريعة</h1>
        <p className="mt-1 text-muted-foreground">اختصارات للمهام المتكررة</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>اختصارات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {ACTIONS.map(({ href, label, icon: Icon }) => (
              <Button key={href} variant="outline" className="h-auto flex-col gap-2 py-6" asChild>
                <Link href={href}>
                  <Icon className="h-6 w-6" />
                  {label}
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
