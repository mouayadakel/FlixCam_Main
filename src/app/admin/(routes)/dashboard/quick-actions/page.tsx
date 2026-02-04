/**
 * @file quick actions dashboard subpage
 * @description Shortcuts for frequent admin tasks
 */

import { Zap } from 'lucide-react'
import { PlaceholderCard } from '@/components/admin/placeholder-card'

export default function DashboardQuickActionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">إجراءات سريعة</h1>
        <p className="text-muted-foreground mt-1">اختصارات للمهام المتكررة</p>
      </div>
      <PlaceholderCard
        title="إجراءات سريعة"
        description="سيتم إضافة اختصارات مثل: حجز جديد، استرداد مبلغ، إنشاء عرض سعر، فتح تقويم. يمكن ربط الأزرار بالصفحات المناسبة عند الجاهزية."
        icon={<Zap className="h-10 w-10" />}
        actionLabel="الحجوزات"
        actionHref="/admin/bookings"
      />
    </div>
  )
}
