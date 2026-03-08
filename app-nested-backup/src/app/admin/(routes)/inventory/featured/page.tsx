/**
 * @file page.tsx
 * @description Featured equipment control – select which equipment appears on the homepage (unlimited).
 * This is the only place to set or clear the featured flag.
 * @module app/admin/(routes)/inventory/featured
 */

'use client'

import { FeaturedEquipmentTable } from '@/components/features/admin/featured-equipment-table'

export default function FeaturedEquipmentPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">المعدات المميزة</h1>
        <p className="mt-1 text-sm text-neutral-600">
          العناصر المحددة هنا تظهر عشوائياً في قسم «معدات مميزة» بالصفحة الرئيسية. يمكنك اختيار عدد
          غير محدود.
        </p>
      </div>
      <FeaturedEquipmentTable />
    </div>
  )
}
