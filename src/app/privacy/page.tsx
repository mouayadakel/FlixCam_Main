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
      <section className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <p className="text-sm text-amber-600">This is a template. Ensure compliance with PDPL and local regulations.</p>
        <h2>Data We Collect</h2>
        <p>We collect name, email, phone, address (if delivery), payment-related data, and booking history as necessary to provide rental services and comply with legal obligations.</p>
        <h2>How We Use Data</h2>
        <p>We use your data to process bookings, communicate with you, process payments, and improve our services. We do not sell your personal data to third parties.</p>
        <h2>Legal Basis (PDPL)</h2>
        <p>Processing is based on contract performance, legitimate interests, and where applicable consent. We retain data as required by law and our retention policy.</p>
        <h2>Your Rights</h2>
        <p>You have the right to access, correct, delete, or restrict processing of your data, and to data portability where applicable. Contact us via the Support page to exercise these rights.</p>
        <h2>Security & Sharing</h2>
        <p>We implement appropriate security measures. We may share data with payment processors, delivery partners, and authorities when required by law.</p>
        <h2>Contact</h2>
        <p>For privacy requests or questions, use the Support page or our contact details.</p>
      </section>
    </main>
  )
}
