/**
 * How it works – client component with full i18n support.
 */

'use client'

import Link from 'next/link'
import { Search, CalendarCheck, CreditCard, Package, RotateCcw } from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'
import { Button } from '@/components/ui/button'

const STEPS = [
  { icon: Search, titleKey: 'howItWorks.step1Title', descKey: 'howItWorks.step1Desc' },
  { icon: CalendarCheck, titleKey: 'howItWorks.step2Title', descKey: 'howItWorks.step2Desc' },
  { icon: CreditCard, titleKey: 'howItWorks.step3Title', descKey: 'howItWorks.step3Desc' },
  { icon: Package, titleKey: 'howItWorks.step4Title', descKey: 'howItWorks.step4Desc' },
  { icon: RotateCcw, titleKey: 'howItWorks.step5Title', descKey: 'howItWorks.step5Desc' },
] as const

export function HowItWorksClient() {
  const { t } = useLocale()

  return (
    <main className="py-12">
      <PublicContainer className="max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-text-heading">{t('howItWorks.pageTitle')}</h1>
        <p className="mb-10 text-text-muted">{t('howItWorks.pageSubtitle')}</p>
        <div className="space-y-10">
          {STEPS.map((step, i) => (
            <div key={step.titleKey} className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                <step.icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text-heading">
                  {t('howItWorks.stepLabel').replace('{n}', String(i + 1))}: {t(step.titleKey)}
                </h2>
                <p className="mt-1 text-text-muted">{t(step.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 flex justify-center">
          <Button asChild size="lg">
            <Link href="/equipment">{t('howItWorks.browseCta')}</Link>
          </Button>
        </div>
      </PublicContainer>
    </main>
  )
}
