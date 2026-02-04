/**
 * @file recent bookings dashboard subpage
 * @description Recent bookings list – hook to bookings API when ready
 */

import { Calendar } from 'lucide-react'
import { PlaceholderCard } from '@/components/admin/placeholder-card'

export default function DashboardRecentBookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">الحجوزات الأخيرة</h1>
        <p className="text-muted-foreground mt-1">آخر الحجوزات والنشاط</p>
      </div>
      <PlaceholderCard
        title="قائمة الحجوزات الأخيرة"
        description="سيتم عرض آخر الحجوزات مع الرقم، العميل، والحالة. ربط هذه الصفحة بـ /api/bookings عند الجاهزية."
        icon={<Calendar className="h-10 w-10" />}
        actionLabel="عرض كل الحجوزات"
        actionHref="/admin/bookings"
      />
    </div>
  )
}
