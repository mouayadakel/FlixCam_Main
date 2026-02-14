/**
 * Rental policies – Insurance, Deposit, ID, Late Fees, Damage, Cancellation.
 */

import Link from 'next/link'
import { PublicContainer } from '@/components/public/public-container'

export default function PoliciesPage() {
  return (
    <main className="py-12">
      <PublicContainer className="max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Rental Policies</h1>
        <p className="text-muted-foreground mb-8">
          Please read our policies before booking. For full legal terms see our{' '}
          <Link href="/terms" className="text-brand-primary underline">Terms & Conditions</Link> and{' '}
          <Link href="/privacy" className="text-brand-primary underline">Privacy Policy</Link>.
        </p>

        <section className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-2">Insurance</h2>
            <p className="text-muted-foreground">
              Equipment is covered by our standard rental insurance during the rental period. Optional damage waiver or higher coverage may be available at checkout. Exclusions apply; see terms for details.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Deposit</h2>
            <p className="text-muted-foreground">
              A refundable deposit (typically 30% of equipment value, min 1,000 SAR, max 50,000 SAR) is required. It is released after equipment is returned and inspected. Deductions may apply for damage or late return.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">ID Requirements</h2>
            <p className="text-muted-foreground">
              Valid government-issued ID (national ID or passport) and, for companies, commercial registration may be required. We may verify identity before releasing equipment.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Late Fees</h2>
            <p className="text-muted-foreground">
              Late returns are charged at 1.5× the daily rate for each day or part day after the agreed return date, unless an extension was approved in advance.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Damage & Loss</h2>
            <p className="text-muted-foreground">
              You are responsible for equipment from pickup until return. Damage or loss must be reported immediately. Repair or replacement costs may be deducted from the deposit or invoiced.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Cancellation</h2>
            <p className="text-muted-foreground">
              Cancellations more than 48 hours before pickup: full refund minus a processing fee. Within 48 hours: deposit may be retained. No-shows forfeit the deposit. See terms for full cancellation policy.
            </p>
          </div>
        </section>
      </PublicContainer>
    </main>
  )
}
