/**
 * Privacy Policy — PDPL-aligned (FIX-052).
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'سياسة الخصوصية | Privacy Policy | FlixCam.rent',
  description:
    'سياسة الخصوصية وحماية البيانات - FlixCam.rent. متوافق مع PDPL ونظام حماية البيانات الشخصية.',
  keywords: ['سياسة الخصوصية', 'privacy policy', 'حماية البيانات', 'PDPL', 'FlixCam'],
}

export default function PrivacyPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12" dir="rtl" lang="ar">
      <h1 className="mb-2 text-3xl font-bold">سياسة الخصوصية</h1>
      <p className="mb-8 text-sm text-muted-foreground">آخر تحديث: يونيو 2026</p>

      <section className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <div>
          <h2>1. مقدمة</h2>
          <p>
            FlixCam.rent («نحن») تلتزم بحماية بياناتك الشخصية وفق نظام حماية البيانات الشخصية (PDPL)
            في المملكة العربية السعودية. توضح هذه السياسة ما نجمعه وكيف نستخدمه وحقوقك.
          </p>
        </div>

        <div>
          <h2>2. البيانات التي نجمعها</h2>
          <ul>
            <li>بيانات الهوية والتواصل: الاسم، البريد، الهاتف، عنوان الفوترة/التوصيل.</li>
            <li>بيانات الحجز والدفع: تفاصيل الإيجار، الفواتير، سجل المدفوعات (لا نخزن بيانات بطاقات كاملة).</li>
            <li>بيانات تقنية: عنوان IP، نوع المتصفح، سجلات الاستخدام لأغراض الأمان والتحليل.</li>
            <li>مستندات التحقق: عند الحاجة للتحقق من الهوية أو الاستلام (حسب سياسة الإيجار).</li>
          </ul>
        </div>

        <div>
          <h2>3. أغراض المعالجة</h2>
          <p>
            نعالج بياناتك لتنفيذ عقود الإيجار، معالجة المدفوعات، التواصل بشأن الحجوزات، الامتثال
            القانوني، منع الاحتيال، وتحسين خدماتنا. لا نبيع بياناتك لأطراف ثالثة.
          </p>
        </div>

        <div>
          <h2>4. الأساس النظامي (PDPL)</h2>
          <p>
            يستند المعالجة إلى: تنفيذ العقد، المصالح المشروعة (الأمان ومنع سوء الاستخدام)، والموافقة
            حيث يلزم (مثل التسويق). نحتفظ بالبيانات للمدة اللازمة قانونياً وتشغيلياً.
          </p>
        </div>

        <div>
          <h2>5. مشاركة البيانات</h2>
          <p>
            قد نشارك البيانات مع: معالجي الدفع، شركاء التوصيل، مزودي البنية التحتية السحابية،
            والجهات الرسمية عند الطلب القانوني. جميع المعالجين ملزمون باتفاقيات حماية مناسبة.
          </p>
        </div>

        <div>
          <h2>6. حقوقك</h2>
          <p>
            يحق لك: الوصول، التصحيح، الحذف أو إخفاء الهوية (عبر{' '}
            <Link href="/portal/profile">بوابة العميل</Link>)، تقييد المعالجة، ونقل البيانات حيث
            ينطبق. للطلبات: support@flixcam.rent
          </p>
        </div>

        <div>
          <h2>7. الأمان</h2>
          <p>
            نطبق ضوابط تقنية وتنظيمية (تشفير النقل، صلاحيات الوصول، سجلات التدقيق). أبلغنا فوراً
            عن أي خرق يؤثر على حقوقك وفق المتطلبات النظامية.
          </p>
        </div>

        <div dir="ltr" lang="en" className="border-t pt-8">
          <h2>Privacy Policy (English Summary)</h2>
          <p>
            FlixCam.rent collects contact, booking, and payment-related data to provide rental
            services under Saudi PDPL. We do not sell personal data. You may export or request
            deletion via the customer portal. Contact: support@flixcam.rent
          </p>
        </div>
      </section>
    </main>
  )
}
