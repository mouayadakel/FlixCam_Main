/**
 * Support – contact, WhatsApp, FAQ.
 */

import Link from 'next/link'
import { siteConfig } from '@/config/site.config'
import { PublicContainer } from '@/components/public/public-container'
import { Button } from '@/components/ui/button'

function getWhatsAppUrl() {
  const num = siteConfig.contact.whatsappNumber.replace(/\D/g, '')
  return `https://wa.me/${num}`
}

const FAQ = [
  { q: 'How do I change or cancel my booking?', a: 'From the portal go to My Bookings, open the booking, and use the request change or cancel option. Refunds follow our cancellation policy.' },
  { q: 'What payment methods do you accept?', a: 'We accept major cards, Apple Pay, STC Pay, Tabby, and bank transfer. Deposit is held and released after return.' },
  { q: 'Do you deliver?', a: 'Yes. Delivery can be selected at checkout. Fees depend on zone; our team will confirm.' },
  { q: 'When is my deposit released?', a: 'After equipment is returned and inspected (usually within 2–3 business days).' },
]

export default function SupportPage() {
  return (
    <main className="py-12">
      <PublicContainer className="max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Support</h1>
        <p className="text-muted-foreground mb-8">
          Get in touch for booking help, technical questions, or feedback.
        </p>

        <div className="grid gap-8 md:grid-cols-2 mb-12">
          <div className="rounded-lg border border-border-light bg-surface-light p-6">
            <h2 className="font-semibold mb-2">Phone & WhatsApp</h2>
            <p className="text-muted-foreground text-sm mb-4">We respond quickly on WhatsApp.</p>
            <Button asChild variant="outline">
              <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
                Chat on WhatsApp
              </a>
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">{siteConfig.contact.phone}</p>
          </div>
          <div className="rounded-lg border border-border-light bg-surface-light p-6">
            <h2 className="font-semibold mb-2">Email</h2>
            <p className="text-muted-foreground text-sm mb-4">For formal requests or documents.</p>
            <a href={`mailto:${siteConfig.contact.email}`} className="text-brand-primary underline">
              {siteConfig.contact.email}
            </a>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-4">FAQ</h2>
        <ul className="space-y-4">
          {FAQ.map((item) => (
            <li key={item.q} className="rounded-lg border border-border-light p-4">
              <h3 className="font-medium">{item.q}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-muted-foreground">
          See also <Link href="/policies" className="text-brand-primary underline">Rental Policies</Link> and{' '}
          <Link href="/how-it-works" className="text-brand-primary underline">How It Works</Link>.
        </p>
      </PublicContainer>
    </main>
  )
}
