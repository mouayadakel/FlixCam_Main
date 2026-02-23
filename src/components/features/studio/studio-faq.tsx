/**
 * Studio FAQ: accordion of FAQs from CMS
 */

'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useLocale } from '@/hooks/use-locale'
import type { StudioPublicData } from '@/lib/types/studio.types'

interface StudioFaqProps {
  studio: StudioPublicData
}

function getFaqText(faq: StudioPublicData['faqs'][0], locale: string): { q: string; a: string } {
  if (locale === 'ar') return { q: faq.questionAr, a: faq.answerAr }
  if (locale === 'zh')
    return {
      q: faq.questionZh || faq.questionAr,
      a: faq.answerZh || faq.answerAr,
    }
  return {
    q: faq.questionEn || faq.questionAr,
    a: faq.answerEn || faq.answerAr,
  }
}

export function StudioFaq({ studio }: StudioFaqProps) {
  const { locale, t } = useLocale()
  const faqs = studio.faqs ?? []

  if (faqs.length === 0) return null

  return (
    <section
      className="rounded-2xl border border-border-light/40 bg-white p-6 shadow-card"
      dir="rtl"
    >
      <h3 className="mb-5 text-lg font-semibold text-text-heading">{t('studios.faq')}</h3>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq) => {
          const { q, a } = getFaqText(faq, locale)
          return (
            <AccordionItem key={faq.id} value={faq.id} className="border-border-light/40">
              <AccordionTrigger className="text-sm font-medium text-text-heading hover:text-primary [&[data-state=open]]:text-primary">
                {q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-text-body">
                {a}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </section>
  )
}
