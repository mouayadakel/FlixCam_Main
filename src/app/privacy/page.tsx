/**
 * Phase 0.6: Privacy Policy placeholder (PDPL compliance).
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'سياسة الخصوصية | FlixCam.rent',
  description: 'سياسة الخصوصية وحماية البيانات - FlixCam.rent',
}

export default function PrivacyPage() {
  return (
    <main className="container mx-auto max-w-3xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">سياسة الخصوصية</h1>
      <p className="text-muted-foreground mb-4">
        تم وضع هذه الصفحة كعنصر نائب. يرجى استبدال المحتوى بنص سياسة الخصوصية المعتمد (متوافق مع PDPL ونظام حماية البيانات الشخصية في المملكة).
      </p>
      <section className="prose prose-neutral dark:prose-invert max-w-none">
        <h2>جمع البيانات</h2>
        <p>نجمع البيانات اللازمة لتقديم الخدمة وإدارة الحجوزات والمدفوعات.</p>
        <h2>استخدام البيانات</h2>
        <p>لا نبيع بياناتك الشخصية. نستخدمها وفقًا لأحكام نظام حماية البيانات الشخصية.</p>
        <h2>اتصل بنا</h2>
        <p>للمطالبة بحق الوصول أو التصحيح أو الحذف، راسلنا عبر صفحة الدعم.</p>
      </section>
    </main>
  )
}
