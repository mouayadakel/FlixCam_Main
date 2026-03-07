/**
 * @file page.tsx
 * @description Settings overview page – Arabic, with links to all settings sections
 * @module app/admin/(routes)/settings
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plug,
  Flag,
  Shield,
  Globe,
  ImageIcon,
  ShoppingCart,
  MessageSquare,
  Bot,
  Users,
  Bell,
  Building2,
  MapPin,
  Percent,
  ScrollText,
  FileSignature,
  CreditCard,
} from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold">الإعدادات</h1>
        <p className="mt-1 text-muted-foreground">إدارة تكاملات المنصة وإعدادات الحساب</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              التكاملات
            </CardTitle>
            <CardDescription>إعداد الخدمات الخارجية</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin/settings/integrations">إدارة التكاملات</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              بوابات الدفع
            </CardTitle>
            <CardDescription>Tap، Moyasar، Tamara وغيرها — تفعيل/إخفاء وترتيب واختبار الاتصال</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/settings/payment-gateways">إدارة بوابات الدفع</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              OTP والدفع
            </CardTitle>
            <CardDescription>مقدمو OTP وبوابة الدفع</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/settings/otp-payment">إعدادات OTP والدفع</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              أعلام الميزات
            </CardTitle>
            <CardDescription>التحكم في توفر الميزات</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/settings/features">إدارة أعلام الميزات</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              إعدادات الدفع
            </CardTitle>
            <CardDescription>تثبيت السعر، سياسة الإلغاء</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/settings/checkout">إعدادات الدفع</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              صفحات الموقع
            </CardTitle>
            <CardDescription>إدارة صفحات الموقع العامة</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/settings/website-pages">إدارة صفحات الموقع</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              الأدوار والصلاحيات
            </CardTitle>
            <CardDescription>إدارة أدوار المستخدمين والصلاحيات</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/settings/roles">إدارة الأدوار</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              سجل التدقيق
            </CardTitle>
            <CardDescription>عرض أحداث النظام والإجراءات</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/settings/audit-log">عرض سجل التدقيق</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              التحكم بالذكاء الاصطناعي
            </CardTitle>
            <CardDescription>إعدادات التوصيات والذكاء الاصطناعي</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/settings/ai">إعدادات الذكاء الاصطناعي</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              شرائح العملاء
            </CardTitle>
            <CardDescription>إدارة شرائح العملاء والتسعير</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/settings/customer-segments">شرائح العملاء</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              قوالب الإشعارات
            </CardTitle>
            <CardDescription>قوالب البريد والإشعارات</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/settings/notification-templates">قوالب الإشعارات</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              الفروع
            </CardTitle>
            <CardDescription>إدارة فروع الشركة</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/settings/branches">إدارة الفروع</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              مناطق التوصيل
            </CardTitle>
            <CardDescription>مناطق ورسوم التوصيل</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/settings/delivery-zones">إدارة مناطق التوصيل</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              بيانات الشركة
            </CardTitle>
            <CardDescription>المستفيد وخطاب المدير لسندات الأمر</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/settings/company">إعدادات الشركة</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              سند الأمر
            </CardTitle>
            <CardDescription>تفعيل/تعطيل سند الأمر للمعدات والاستوديو</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/settings/promissory-note">إعدادات سند الأمر</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              الضريبة
            </CardTitle>
            <CardDescription>إعدادات ضريبة القيمة المضافة</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/settings/tax">إعدادات الضريبة</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
