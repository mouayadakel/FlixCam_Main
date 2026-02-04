/**
 * @file activity dashboard subpage
 * @description Activity feed placeholder – timeline events, alerts, system notifications
 */

import { Activity } from 'lucide-react'
import { PlaceholderCard } from '@/components/admin/placeholder-card'

export default function DashboardActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">النشاط الأخير</h1>
        <p className="text-muted-foreground mt-1">سجل الأحداث والتنبيهات على المنصة</p>
      </div>
      <PlaceholderCard
        title="سجل النشاط"
        description="سيتم عرض آخر الأحداث: تأكيد حجوزات، مدفوعات، طلبات موافقة، وتنبيهات النظام. ربط هذه الصفحة بمصدر الأحداث عند الجاهزية."
        icon={<Activity className="h-10 w-10" />}
        actionLabel="عرض لوحة التحكم"
        actionHref="/admin/dashboard"
      />
    </div>
  )
}
