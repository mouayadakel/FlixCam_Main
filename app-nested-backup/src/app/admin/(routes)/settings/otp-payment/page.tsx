/**
 * @file page.tsx
 * @description Admin - OTP providers & Payment settings (Phase 5.3). Links to env and integrations.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, CreditCard, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function OtpPaymentSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">إعدادات OTP والدفع</h1>
        <p className="mt-2 text-muted-foreground">
          مزودي OTP (التحقق بالهاتف) وإعدادات بوابة الدفع (TAP، إلخ)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            OTP (التحقق بالهاتف)
          </CardTitle>
          <CardDescription>
            إرسال والتحقق من الرمز يتم عبر الـ API الحالي. المزود يُعرّف في المتغيرات البيئية.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            المتغيرات: معدل الحد (Rate limit) في Redis/Upstash، مدة صلاحية الرمز في الكاش.
          </p>
          <Badge variant="outline">إعدادات OTP في .env والكود (قابل للتوسع لجدول لاحقاً)</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            الدفع (TAP، Apple Pay، STC Pay، Tabby)
          </CardTitle>
          <CardDescription>
            مفاتيح التكامل مع TAP وغيرها تُدار من صفحة التكاملات أو المتغيرات البيئية.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/admin/settings/integrations" className="inline-flex items-center gap-2">
              فتح التكاملات
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
