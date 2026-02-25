'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PublicContainer } from '@/components/public/public-container'
import { cn } from '@/lib/utils'
import { Sparkles, ArrowLeft, ShoppingCart } from 'lucide-react'
import { isExternalImageUrl } from '@/lib/utils/image.utils'

interface CompareItemPayload {
  id: string
  name: string
  slug: string
  image: string | null
  brand: string | null
  category: string | null
  dailyPrice: number | null
  weeklyPrice: number | null
  monthlyPrice: number | null
  description: string | null
}

interface SpecRow {
  key: string
  values: (string | null)[]
  isDifferent: boolean
  isMissingSome: boolean
}

interface CompareData {
  items: CompareItemPayload[]
  specMatrix: {
    priority: SpecRow[]
    differences: SpecRow[]
    identical: SpecRow[]
  }
  totalSpecKeys: number
}

type SectionKey = 'priority' | 'differences' | 'identical'

export function ComparePageClient() {
  const params = useSearchParams()
  const router = useRouter()
  const ids = params?.get('ids')?.split(',').filter(Boolean) ?? []

  const [data, setData] = useState<CompareData | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<SectionKey>('priority')

  useEffect(() => {
    if (ids.length < 2) {
      router.push('/equipment')
      return
    }
    setLoading(true)
    setData(null)
    fetch(`/api/public/compare?ids=${ids.join(',')}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data: d }) => {
        if (ok && Array.isArray(d?.items) && d.items.length >= 2) {
          setData(d as CompareData)
        } else {
          setData(null)
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [ids.join(','), router])

  const loadSummary = async () => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/public/compare/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const d = await res.json()
      if (res.ok) setSummary(d.summary ?? null)
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        جاري تحميل المقارنة...
      </div>
    )
  }

  if (!data || !Array.isArray(data.items) || data.items.length < 2) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-red-500">
          {ids.length >= 2
            ? 'المعدات المحددة غير متوفرة أو تم إزالتها. تأكد من الرابط أو اختر معدات أخرى للمقارنة.'
            : 'تحتاج إلى اختيار معدتين على الأقل للمقارنة.'}
        </p>
        <Button variant="outline" onClick={() => router.push('/equipment')}>
          العودة إلى المعدات
        </Button>
      </div>
    )
  }

  const { items, specMatrix } = data
  const specs = specMatrix[activeSection] ?? []

  return (
    <div className="min-h-screen bg-surface-light pb-20">
      <div className="sticky top-0 z-10 border-b border-border-light bg-white">
        <PublicContainer>
          <div className="flex items-center gap-3 py-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-text-muted hover:text-text-heading"
              aria-label="رجوع"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-text-heading">
              مقارنة المعدات
            </h1>
            <span className="mr-auto text-sm text-text-muted">
              {data.totalSpecKeys} مواصفة
            </span>
          </div>
        </PublicContainer>
      </div>

      <PublicContainer className="pt-6 space-y-6">
        {/* Equipment cards row */}
        <div
          className={cn(
            'grid gap-4',
            items.length === 2 && 'grid-cols-[200px_1fr_1fr]',
            items.length === 3 && 'grid-cols-[200px_1fr_1fr_1fr]',
            items.length === 4 && 'grid-cols-[200px_1fr_1fr_1fr_1fr]'
          )}
        >
          <div aria-hidden />
          {items.map((item) => {
            const href = `/equipment/${item.slug || item.id}`
            return (
              <Link
                key={item.id}
                href={href}
                className="block rounded-xl bg-white p-4 text-center shadow-card transition-shadow hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={120}
                    height={120}
                    className="mx-auto mb-3 rounded-lg object-cover"
                    unoptimized={isExternalImageUrl(item.image)}
                  />
                ) : (
                  <div className="mx-auto mb-3 h-[120px] w-[120px] rounded-lg bg-surface-light" />
                )}
                <p className="text-sm font-bold leading-tight mb-1 text-text-heading">
                  {item.name}
                </p>
                {item.brand && (
                  <p className="text-xs text-text-muted mb-2">{item.brand}</p>
                )}
                {item.dailyPrice != null && item.dailyPrice > 0 && (
                  <p className="text-sm font-bold text-brand-primary">
                    {item.dailyPrice.toLocaleString()} ر.س/يوم
                  </p>
                )}
                <span
                  className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
                  aria-hidden
                >
                  <ShoppingCart className="h-3 w-3" /> احجز الآن
                </span>
              </Link>
            )
          })}
        </div>

        {/* AI summary */}
        <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50 p-5">
          {!summary ? (
            <div className="text-center">
              <p className="mb-3 text-sm text-text-muted">
                احصل على مقارنة ذكية بالذكاء الاصطناعي
              </p>
              <Button
                size="sm"
                onClick={loadSummary}
                disabled={aiLoading}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {aiLoading ? 'جاري التحليل...' : 'حلّل بالذكاء الاصطناعي'}
              </Button>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-semibold text-text-heading">
                  تحليل ذكي
                </span>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-text-body">
                {summary}
              </p>
            </div>
          )}
        </div>

        {/* Spec table */}
        <div className="overflow-hidden rounded-xl bg-white shadow-card">
          <div className="flex border-b border-border-light">
            {(
              [
                { key: 'priority' as const, label: 'المواصفات الأساسية' },
                {
                  key: 'differences' as const,
                  label: `الاختلافات (${specMatrix.differences?.length ?? 0})`,
                },
                {
                  key: 'identical' as const,
                  label: `المتشابهة (${specMatrix.identical?.length ?? 0})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSection(tab.key)}
                className={cn(
                  'flex-1 border-b-2 py-3 text-sm font-medium transition-colors',
                  activeSection === tab.key
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-text-muted hover:text-text-heading'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[200px]" />
                {items.map((_, i) => (
                  <col key={i} />
                ))}
              </colgroup>
              <tbody className="divide-y divide-border-light">
                {specs.map((row) => (
                  <tr
                    key={row.key}
                    className={cn(row.isDifferent && 'bg-amber-50/50')}
                  >
                    <td className="min-w-[200px] px-4 py-3 text-right font-medium text-text-muted">
                      {row.key.replace(/_/g, ' ')}
                      {row.isDifferent && (
                        <span className="mr-1 text-xs text-amber-600">●</span>
                      )}
                    </td>
                    {row.values.map((val, i) => (
                      <td
                        key={i}
                        className={cn(
                          'px-4 py-3 text-center',
                          row.isDifferent &&
                            items.length === 2 &&
                            i === 0 &&
                            'font-semibold text-blue-700',
                          row.isDifferent &&
                            items.length === 2 &&
                            i === 1 &&
                            'font-semibold text-purple-700'
                        )}
                      >
                        {val ? (
                          <span className="text-text-body">{val}</span>
                        ) : (
                          <span className="text-xs text-border-light">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PublicContainer>
    </div>
  )
}
