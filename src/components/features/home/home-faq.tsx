/**
 * Homepage FAQ section – shows first 5 questions + "عرض المزيد" link to full FAQ page.
 * Fetches from /api/public/faq; falls back to static translation keys if empty or error.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { HelpCircle, ChevronLeft } from 'lucide-react'

const HOMEPAGE_FAQ_LIMIT = 5

interface FaqItemPublic {
  id: string
  questionAr: string
  questionEn: string
  questionZh: string | null
  answerAr: string
  answerEn: string
  answerZh: string | null
  order: number
}

const FALLBACK_FAQ_ITEMS = [
  { q: 'faq.q1', a: 'faq.a1' },
  { q: 'faq.q2', a: 'faq.a2' },
  { q: 'faq.q3', a: 'faq.a3' },
] as const

function getQuestion(item: FaqItemPublic, locale: string): string {
  if (locale === 'ar') return item.questionAr
  if (locale === 'zh') return item.questionZh || item.questionEn
  return item.questionEn
}

function getAnswer(item: FaqItemPublic, locale: string): string {
  if (locale === 'ar') return item.answerAr
  if (locale === 'zh') return item.answerZh || item.answerEn
  return item.answerEn
}

export function HomeFaq() {
  const { t, locale } = useLocale()
  const [apiItems, setApiItems] = useState<FaqItemPublic[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/public/faq')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return
        const data = json?.data
        if (Array.isArray(data) && data.length > 0) {
          setApiItems(data)
        } else {
          setApiItems([])
        }
      })
      .catch(() => {
        if (!cancelled) setApiItems([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const useFallback = apiItems === null || apiItems.length === 0
  const displayItems = useFallback ? FALLBACK_FAQ_ITEMS : apiItems.slice(0, HOMEPAGE_FAQ_LIMIT)

  return (
    <section className="border-t border-border-light/50 bg-surface-light py-10 md:py-14">
      <PublicContainer className="max-w-3xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/10">
            <HelpCircle className="h-6 w-6 text-brand-primary" />
          </div>
          <h2 className="text-section-title text-text-heading">{t('faq.title')}</h2>
          <p className="mx-auto mt-3 max-w-md text-body-main text-text-body">
            {t('home.faqSubtitle')}
          </p>
        </div>
        <div className="rounded-2xl border border-border-light/60 bg-white p-2 shadow-card">
          <Accordion type="single" collapsible className="w-full">
            {useFallback
              ? (displayItems as typeof FALLBACK_FAQ_ITEMS).map((item, index) => (
                  <AccordionItem
                    key={item.q}
                    value={item.q}
                    className={index === displayItems.length - 1 ? 'border-b-0' : ''}
                  >
                    <AccordionTrigger className="px-4 py-5 text-start font-semibold text-text-heading transition-colors hover:text-brand-primary hover:no-underline [&[data-state=open]]:text-brand-primary">
                      {t(item.q)}
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-5 text-body-main leading-relaxed text-text-body">
                      {t(item.a)}
                    </AccordionContent>
                  </AccordionItem>
                ))
              : (displayItems as FaqItemPublic[]).map((item, index) => (
                  <AccordionItem
                    key={item.id}
                    value={item.id}
                    className={index === displayItems.length - 1 ? 'border-b-0' : ''}
                  >
                    <AccordionTrigger className="px-4 py-5 text-start font-semibold text-text-heading transition-colors hover:text-brand-primary hover:no-underline [&[data-state=open]]:text-brand-primary">
                      {getQuestion(item, locale)}
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-5 text-body-main leading-relaxed text-text-body">
                      {getAnswer(item, locale)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
          </Accordion>
        </div>
        <div className="mt-6 flex justify-center">
          <Button variant="outline" size="lg" className="gap-2" asChild>
            <Link href="/faq">
              <span>{locale === 'ar' ? 'عرض المزيد' : 'Show more'}</span>
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Link>
          </Button>
        </div>
      </PublicContainer>
    </section>
  )
}
