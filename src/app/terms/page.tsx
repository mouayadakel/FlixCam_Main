/**
 * Terms of Service (FIX-052).
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'الشروط والأحكام | Terms of Service | FlixCam.rent',
  description:
    'الشروط والأحكام العامة لاستخدام FlixCam.rent. شروط الخدمة، القبول، الدفع، الإلغاء، والمسؤولية.',
  keywords: ['شروط الاستخدام', 'terms of service', 'الشروط والأحكام', 'FlixCam'],
}

export default function TermsPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12" dir="rtl" lang="ar">
      <h1 className="mb-2 text-3xl font-bold">الشروط والأحكام</h1>
      <p className="mb-8 text-sm text-muted-foreground">آخر تحديث: يونيو 2026</p>

      <section className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <div>
          <h2>1. القبول</h2>
          <p>
            باستخدامك لموقع FlixCam.rent أو إتمام حجز، فإنك توافق على هذه الشروط و{' '}
            <Link href="/policies">سياسات الإيجار</Link> و<Link href="/privacy">سياسة الخصوصية</Link>.
          </p>
        </div>

        <div>
          <h2>2. الخدمة</h2>
          <p>
            نوفر إيجار معدات تصوير واستوديوهات. الأسعار والتوفر كما هو معروض عند الدفع. العروض
            السعرية قابلة للتغيير حتى تأكيد الدفع.
          </p>
        </div>

        <div>
          <h2>3. الحجز والدفع</h2>
          <ul>
            <li>يلزم تأكيد الحجز بالدفع أو الموافقة الائتمانية المعتمدة.</li>
            <li>قد يُطلب تأمين/وديعة قابلة للاسترداد بعد فحص المرتجعات.</li>
            <li>التأخير في الدفع قد يؤدي إلى إلغاء الحجز.</li>
            <li>الأسعار تشمل ضريبة القيمة المضافة حيث ينطبق.</li>
          </ul>
        </div>

        <div>
          <h2>4. الاستلام والإرجاع</h2>
          <p>
            العميل مسؤول عن المعدات من لحظة الاستلام حتى الإرجاع. يجب إرجاعها بالحالة المتفق
            عليها. التأخير أو التلف قد يترتب عليه رسوم وفق{' '}
            <Link href="/policies">سياسة الأضرار والتأخير</Link>.
          </p>
        </div>

        <div>
          <h2>5. الإلغاء والاسترداد</h2>
          <p>
            تخضع الإلغاءات والاستردادات لجدول سياسات الإيجار المنشور. تُعالج المبالغ المستردة خلال
            المدة المحددة بعد الموافقة.
          </p>
        </div>

        <div>
          <h2>6. حدود المسؤولية</h2>
          <p>
            لا نتحمل الأضرار غير المباشرة أو فقدان الأرباح الناتج عن استخدام المعدات. مسؤوليتنا
            محدودة بقيمة الحجز ما لم يكن النص النظامي يقضي بغير ذلك.
          </p>
        </div>

        <div>
          <h2>7. القانون الحاكم</h2>
          <p>تخضع هذه الشروط لأنظمة المملكة العربية السعودية. النزاعات تُحل أمام المحاكم المختصة.</p>
        </div>

        <div dir="ltr" lang="en" className="border-t pt-8">
          <h2>Terms of Service (English Summary)</h2>
          <p>
            By booking on FlixCam.rent you agree to our rental policies and privacy policy. You are
            responsible for equipment from pickup to return. Cancellations follow published rental
            policies. Governing law: Kingdom of Saudi Arabia.
          </p>
        </div>
      </section>
    </main>
  )
}
