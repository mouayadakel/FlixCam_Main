/**
 * @file page.tsx
 * @description Admin - Checkout settings (Phase 5.2). Placeholder for price lock TTL, cancellation policy, etc.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart } from 'lucide-react'

export default function CheckoutSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">إعدادات الدفع والحجز</h1>
        <p className="text-muted-foreground mt-2">
          مدة قفل السعر، سياسة الإلغاء، وإعدادات الـ Checkout (قيد التوسع)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            الإعدادات الحالية
          </CardTitle>
          <CardDescription>
            القيم المعتمدة حالياً في الكود (يمكن نقلها لجدول إعدادات لاحقاً)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">قفل السعر (Price Lock TTL)</span>
            <Badge variant="outline">15 دقيقة (في الكود)</Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">الإلغاء مسموح قبل بدء الحجز</span>
            <Badge variant="outline">48 ساعة (في الكود)</Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">ضريبة القيمة المضافة</span>
            <Badge variant="outline">15% (السعودية)</Badge>
          </div>
          <p className="text-sm text-muted-foreground pt-4">
            لتفعيل التعديل من الواجهة: أضف جدول SiteSetting أو FeatureFlag للقيم القابلة للتغيير.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
