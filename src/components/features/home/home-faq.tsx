/**
 * Homepage FAQ section – modern accordion with clean styling and visual treatment.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { HelpCircle } from 'lucide-react'

const FAQ_ITEMS = [
  { q: 'faq.q1', a: 'faq.a1' },
  { q: 'faq.q2', a: 'faq.a2' },
  { q: 'faq.q3', a: 'faq.a3' },
] as const

export function HomeFaq() {
  const { t } = useLocale()

  return (
    <section className="py-16 md:py-20 lg:py-24 bg-surface-light border-t border-border-light/50">
      <PublicContainer className="max-w-3xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/10">
            <HelpCircle className="h-6 w-6 text-brand-primary" />
          </div>
          <h2 className="text-section-title text-text-heading">
            {t('faq.title')}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-body-main text-text-body">
            {t('home.heroSubtitle')}
          </p>
        </div>
        <div className="rounded-2xl border border-border-light/60 bg-white p-2 shadow-card">
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem
                key={item.q}
                value={item.q}
                className={index === FAQ_ITEMS.length - 1 ? 'border-b-0' : ''}
              >
                <AccordionTrigger className="px-4 py-5 text-start font-semibold text-text-heading hover:text-brand-primary hover:no-underline transition-colors [&[data-state=open]]:text-brand-primary">
                  {t(item.q)}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-5 text-body-main leading-relaxed text-text-body">
                  {t(item.a)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </PublicContainer>
    </section>
  )
}
