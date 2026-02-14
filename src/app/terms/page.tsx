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
      <section className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <p className="text-sm text-amber-600">This is a template. Consult legal counsel before use.</p>
        <h2>Acceptance of Terms</h2>
        <p>By using the site and placing a booking you agree to these terms and our rental policies.</p>
        <h2>Services</h2>
        <p>We provide equipment and studio rental services. Prices and availability are as shown at checkout. Quotes may be subject to change until payment is confirmed.</p>
        <h2>Deposit & Payment</h2>
        <p>A refundable deposit is required per our policy. Payment is due as indicated. Late payment may result in cancellation.</p>
        <h2>Cancellation & Refunds</h2>
        <p>Cancellation and refund rules are set out in our Rental Policies. Refunds are processed within a defined period after approval.</p>
        <h2>Liability</h2>
        <p>You are responsible for equipment from pickup until return. Damage or loss may be charged per our policies. We are not liable for consequential losses arising from use of rented equipment.</p>
        <h2>Contact</h2>
        <p>For questions about these terms, contact us via the Support page.</p>
      </section>
    </main>
  )
}
