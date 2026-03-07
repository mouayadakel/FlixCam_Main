'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'
import { FileText, Loader2 } from 'lucide-react'

interface PolicyItemPublic {
  id: string
  titleAr: string
  titleEn: string
  titleZh: string | null
  bodyAr: string
  bodyEn: string
  bodyZh: string | null
  order: number
}

function getTitle(item: PolicyItemPublic, locale: string): string {
  if (locale === 'ar') return item.titleAr
  if (locale === 'zh') return item.titleZh || item.titleEn
  return item.titleEn
}

function getBody(item: PolicyItemPublic, locale: string): string {
  if (locale === 'ar') return item.bodyAr
  if (locale === 'zh') return item.bodyZh || item.bodyEn
  return item.bodyEn
}

/** Static fallback when no policy items in DB (same content as original page). */
function StaticPoliciesContent({ locale }: { locale: string }) {
  const isAr = locale === 'ar'
  const sections = isAr
    ? [
        {
          title: 'التأمين',
          body: 'المعدات مغطاة بتأمين التأجير القياسي خلال فترة التأجير. قد يتوفر تنازل عن الأضرار أو تغطية أعلى عند الدفع. تنطبق استثناءات؛ راجع الشروط للتفاصيل.',
        },
        {
          title: 'الوديعة',
          body: 'وديعة قابلة للاسترداد (عادة 30٪ من قيمة المعدات، حد أدنى 1000 ريال، حد أقصى 50000 ريال) مطلوبة. تُطلق بعد إرجاع المعدات وفحصها. قد تُخصم مبالغ عن الأضرار أو التأخير.',
        },
        {
          title: 'متطلبات الهوية',
          body: 'قد يُطلب بطاقة هوية حكومية سارية (الهوية الوطنية أو جواز السفر)، وللشركات السجل التجاري. قد نتحقق من الهوية قبل تسليم المعدات.',
        },
        {
          title: 'رسوم التأخير',
          body: 'الإرجاع المتأخر يُحتسب بمقدار 1.5× معدل اليوم عن كل يوم أو جزء من يوم بعد تاريخ الإرجاع المتفق عليه، ما لم يتم الموافقة على تمديد مسبقاً.',
        },
        {
          title: 'الأضرار والضياع',
          body: 'أنت مسؤول عن المعدات من الاستلام حتى الإرجاع. يجب الإبلاغ عن أي ضرر أو ضياع فوراً. قد تُخصم تكاليف الإصلاح أو الاستبدال من الوديعة أو تُفوتر.',
        },
        {
          title: 'الإلغاء',
          body: 'الإلغاء قبل أكثر من 48 ساعة من الاستلام: استرداد كامل مخصوماً رسوم المعالجة. خلال 48 ساعة: قد تُحجز الوديعة. الغياب يفقد الوديعة. راجع الشروط لسياسة الإلغاء الكاملة.',
        },
      ]
    : [
        {
          title: 'Insurance',
          body: 'Equipment is covered by our standard rental insurance during the rental period. Optional damage waiver or higher coverage may be available at checkout. Exclusions apply; see terms for details.',
        },
        {
          title: 'Deposit',
          body: 'A refundable deposit (typically 30% of equipment value, min 1,000 SAR, max 50,000 SAR) is required. It is released after equipment is returned and inspected. Deductions may apply for damage or late return.',
        },
        {
          title: 'ID Requirements',
          body: 'Valid government-issued ID (national ID or passport) and, for companies, commercial registration may be required. We may verify identity before releasing equipment.',
        },
        {
          title: 'Late Fees',
          body: 'Late returns are charged at 1.5× the daily rate for each day or part day after the agreed return date, unless an extension was approved in advance.',
        },
        {
          title: 'Damage & Loss',
          body: 'You are responsible for equipment from pickup until return. Damage or loss must be reported immediately. Repair or replacement costs may be deducted from the deposit or invoiced.',
        },
        {
          title: 'Cancellation',
          body: 'Cancellations more than 48 hours before pickup: full refund minus a processing fee. Within 48 hours: deposit may be retained. No-shows forfeit the deposit. See terms for full cancellation policy.',
        },
      ]
  return (
    <section className="space-y-8">
      {sections.map((s, i) => (
        <div key={i}>
          <h2 className="mb-2 text-xl font-semibold">{s.title}</h2>
          <p className="text-muted-foreground">{s.body}</p>
        </div>
      ))}
    </section>
  )
}

export function PoliciesPageClient() {
  const { locale } = useLocale()
  const [items, setItems] = useState<PolicyItemPublic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/public/policies')
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

  const introAr = 'يرجى قراءة سياساتنا قبل الحجز. للشروط القانونية الكاملة راجع '
  const introEn = 'Please read our policies before booking. For full legal terms see our '

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
    <main className="py-12">
      <PublicContainer className="max-w-3xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/10">
          <FileText className="h-6 w-6 text-brand-primary" />
        </div>
        <h1 className="mb-6 text-3xl font-bold">
          {locale === 'ar' ? 'سياسات التأجير' : 'Rental Policies'}
        </h1>
        <p className="mb-8 text-muted-foreground">
          {locale === 'ar' ? introAr : introEn}
          <Link href="/terms" className="text-brand-primary underline">
            {locale === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}
          </Link>
          {locale === 'ar' ? ' و' : ' and '}
          <Link href="/privacy" className="text-brand-primary underline">
            {locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </Link>
          {locale === 'ar' ? '.' : '.'}
        </p>

        {items.length === 0 ? (
          <StaticPoliciesContent locale={locale} />
        ) : (
          <section className="space-y-8">
            {items.map((item) => (
              <div key={item.id}>
                <h2 className="mb-2 text-xl font-semibold">{getTitle(item, locale)}</h2>
                <div className="whitespace-pre-wrap text-muted-foreground">
                  {getBody(item, locale)}
                </div>
              </div>
            ))}
          </section>
        )}
      </PublicContainer>
    </main>
  )
}
