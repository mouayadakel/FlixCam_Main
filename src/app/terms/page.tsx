/**
 * Phase 0.6: Terms of Service placeholder.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'الشروط والأحكام | FlixCam.rent',
  description: 'الشروط والأحكام العامة لاستخدام FlixCam.rent',
}

export default function TermsPage() {
  return (
    <main className="container mx-auto max-w-3xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">الشروط والأحكام</h1>
      <p className="text-muted-foreground mb-4">
        تم وضع هذه الصفحة كعنصر نائب. يرجى استبدال المحتوى بنص الشروط والأحكام المعتمد قانونيًا.
      </p>
      <section className="prose prose-neutral dark:prose-invert max-w-none">
        <h2>قبول الشروط</h2>
        <p>باستخدام الموقع فإنك توافق على هذه الشروط.</p>
        <h2>الخدمات</h2>
        <p>نقدم خدمات تأجير المعدات والاستوديوهات وفقًا للأسعار والشروط المعروضة.</p>
        <h2>الإلغاء والاسترداد</h2>
        <p>تخضع سياسات الإلغاء والاسترداد للشروط المعروضة عند الحجز.</p>
      </section>
    </main>
  )
}
