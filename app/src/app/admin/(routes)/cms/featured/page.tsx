/**
 * @file page.tsx
 * @description Admin – Featured content management hub: featured equipment control embedded, placeholders for offers/homepage content.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Star, Package, Tag, Layout } from 'lucide-react'
import { FeaturedEquipmentTable } from '@/components/features/admin/featured-equipment-table'

export default function FeaturedPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Star className="h-8 w-8" />
          المحتوى المميز (Featured)
        </h1>
        <p className="mt-1 text-muted-foreground">
          إدارة العناصر المميزة المعروضة على الموقع: معدات مميزة، عروض، ومحتوى الصفحة الرئيسية
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              المعدات المميزة
            </CardTitle>
            <CardDescription>
              واجهة التحكم جاهزة — اختر المعدات التي تظهر في قسم «معدات مميزة» على الصفحة الرئيسية.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FeaturedEquipmentTable embedded showLinkToFullPage />
          </CardContent>
        </Card>

        <Card className="opacity-90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              العروض والترويج
            </CardTitle>
            <CardDescription>
              إدارة العروض والمحتوى الترويجي المميز على الصفحة الرئيسية.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">قريباً</p>
            <Button variant="outline" className="w-full" disabled>
              قيد التطوير
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-90 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              محتوى رئيسي على الصفحة الرئيسية
            </CardTitle>
            <CardDescription>
              إدارة الأقسام والنصوص الرئيسية الأخرى على الصفحة الرئيسية (هيرو، نصوص، إلخ).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">قريباً</p>
            <Button variant="outline" className="w-full" disabled>
              قيد التطوير
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
