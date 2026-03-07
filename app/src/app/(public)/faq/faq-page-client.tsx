'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { HelpCircle, Loader2 } from 'lucide-react'

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

export function FaqPageClient() {
  const { locale } = useLocale()
  const [items, setItems] = useState<FaqItemPublic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/public/faq')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return
        const data = json?.data
        setItems(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">
          {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/10">
          <HelpCircle className="h-6 w-6 text-brand-primary" />
        </div>
        <h1 className="text-3xl font-bold text-text-heading md:text-4xl">
          {locale === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-body-main text-text-body">
          {locale === 'ar'
            ? 'جميع الأسئلة الشائعة عن التأجير معنا'
            : 'All frequently asked questions about renting with us'}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {locale === 'ar' ? 'لا توجد أسئلة حالياً.' : 'No questions at the moment.'}
        </p>
      ) : (
        <div className="rounded-2xl border border-border-light/60 bg-white p-2 shadow-card">
          <Accordion type="single" collapsible className="w-full">
            {items.map((item, index) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className={index === items.length - 1 ? 'border-b-0' : ''}
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
      )}
    </div>
  )
}
