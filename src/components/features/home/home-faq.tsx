/**
 * Homepage FAQ section (Phase 2.1).
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const FAQ_ITEMS = [
  { q: 'faq.q1', a: 'faq.a1' },
  { q: 'faq.q2', a: 'faq.a2' },
  { q: 'faq.q3', a: 'faq.a3' },
] as const

export function HomeFaq() {
  const { t } = useLocale()

  return (
    <section className="py-12 md:py-16 border-t">
      <div className="container px-4 max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold text-center mb-8">
          {t('faq.title')}
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger>{t(item.q)}</AccordionTrigger>
              <AccordionContent>{t(item.a)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
