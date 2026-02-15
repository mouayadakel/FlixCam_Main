/**
 * How it works – 5 steps with short descriptions.
 * Guarded by enable_how_it_works feature flag.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Search, CalendarCheck, CreditCard, Package, RotateCcw } from 'lucide-react'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { PublicContainer } from '@/components/public/public-container'
import { Button } from '@/components/ui/button'

const STEPS = [
  { icon: Search, title: 'Choose', description: 'Browse our catalog, filter by category and dates, and add equipment or kits to your cart.' },
  { icon: CalendarCheck, title: 'Book', description: 'Select your pickup and return dates. We’ll confirm availability and lock the price for 15 minutes.' },
  { icon: CreditCard, title: 'Pay', description: 'Pay the rental total and deposit securely. We accept cards, Apple Pay, and bank transfer.' },
  { icon: Package, title: 'Receive', description: 'Pick up at our location or get delivery. We’ll do a quick handover and inspection.' },
  { icon: RotateCcw, title: 'Return', description: 'Return equipment on time and in the same condition. After inspection we release your deposit.' },
]

export default async function HowItWorksPage() {
  const enabled = await FeatureFlagService.isEnabled('enable_how_it_works')
  if (!enabled) redirect('/')
  return (
    <main className="py-12">
      <PublicContainer className="max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">How It Works</h1>
        <p className="text-muted-foreground mb-10">
          Rent professional film equipment in five simple steps.
        </p>
        <div className="space-y-10">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                <step.icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Step {i + 1}: {step.title}</h2>
                <p className="mt-1 text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 flex justify-center">
          <Button asChild size="lg">
            <Link href="/equipment">Browse equipment</Link>
          </Button>
        </div>
      </PublicContainer>
    </main>
  )
}
