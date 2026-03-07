/**
 * Promissory Note sign page – shown before payment when PN is required
 */

'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, ArrowRight } from 'lucide-react'

const SignatureCanvas = dynamic(
  () => import('react-signature-canvas').then((mod) => mod.default),
  { ssr: false }
)

interface PreviewData {
  bookingId: string
  bookingNumber: string
  invoiceNumber: string
  debtorName: string
  debtorPhone: string
  debtorEmail: string
  amountSar: number
  amountInWords: string
  equipmentItems: { name: string; purchaseValue: number; quantity: number }[]
  expectedReturnDate: string
  dueDate: string
  creditorName: string
  managerLetterTemplate: string
  managerName: string
  managerTitle: string
}

function formatSar(value: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function PromissoryNoteSignPage() {
  const { t, dir } = useLocale()
  const router = useRouter()
  const params = useParams()
  const bookingId = params?.bookingId as string
  const [data, setData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [terms, setTerms] = useState(false)
  const [damage, setDamage] = useState(false)
  const [lateFees, setLateFees] = useState(false)
  const [binding, setBinding] = useState(false)
  const sigRef = useRef<{ clear: () => void; toDataURL: () => string; isEmpty: () => boolean } | null>(null)

  useEffect(() => {
    if (!bookingId) return
    let cancelled = false
    fetch(`/api/promissory-notes/booking/${bookingId}/preview`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed'))))
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('promissoryNote.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [bookingId, t])

  const allChecked = terms && damage && lateFees && binding

  const handleSign = async () => {
    if (!bookingId || !sigRef.current) return
    if (sigRef.current.isEmpty()) {
      setError(t('promissoryNote.signRequired'))
      return
    }
    const signatureData = sigRef.current.toDataURL()
    if (!signatureData) return
    setSigning(true)
    setError(null)
    try {
      const res = await fetch('/api/promissory-notes/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          termsAccepted: true,
          damagePolicyAccepted: true,
          lateFeesAccepted: true,
          signatureData,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || t('promissoryNote.signFailed'))
        setSigning(false)
        return
      }
      const payRes = await fetch('/api/checkout/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const payData = await payRes.json().catch(() => ({}))
      if (payRes.ok && payData.redirectUrl) {
        window.location.href = payData.redirectUrl
        return
      }
      router.push(`/booking/confirmation/${bookingId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('promissoryNote.error'))
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <main className="container mx-auto flex min-h-[400px] items-center justify-center px-4 py-12">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </main>
    )
  }

  if (error && !data) {
    return (
      <main className="container mx-auto px-4 py-12" dir={dir}>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/checkout')}>
              {t('promissoryNote.backToCheckout')}
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!data) return null

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8" dir={dir}>
      <h1 className="mb-6 text-2xl font-bold">{t('promissoryNote.title')}</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('promissoryNote.bookingSummary')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">{t('promissoryNote.bookingNumber')}:</span> {data.bookingNumber}
          </p>
          <p>
            <span className="text-muted-foreground">{t('promissoryNote.invoice')}:</span> {data.invoiceNumber}
          </p>
          <p>
            <span className="text-muted-foreground">{t('promissoryNote.amount')}:</span>{' '}
            <span className="font-bold">{formatSar(data.amountSar)}</span>
          </p>
          <p className="text-muted-foreground">{data.amountInWords}</p>
          {data.equipmentItems.length > 0 && (
            <div className="mt-2">
              <p className="font-medium">{t('promissoryNote.equipment')}:</p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                {data.equipmentItems.map((it, i) => (
                  <li key={i}>
                    {it.name} × {it.quantity}: {formatSar(it.purchaseValue * it.quantity)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p>
            <span className="text-muted-foreground">{t('promissoryNote.expectedReturnDate')}:</span> {data.expectedReturnDate}
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('promissoryNote.consents')}</CardTitle>
          <CardDescription>{t('promissoryNote.consentsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={terms} onCheckedChange={(v) => setTerms(!!v)} />
            <span className="text-sm">{t('promissoryNote.termsAccept')}</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={damage} onCheckedChange={(v) => setDamage(!!v)} />
            <span className="text-sm">{t('promissoryNote.damagePolicyAccept')}</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={lateFees} onCheckedChange={(v) => setLateFees(!!v)} />
            <span className="text-sm">{t('promissoryNote.lateFeesAccept')}</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={binding} onCheckedChange={(v) => setBinding(!!v)} />
            <span className="text-sm">{t('promissoryNote.bindingAccept')}</span>
          </label>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('promissoryNote.signature')}</CardTitle>
          <CardDescription>{t('promissoryNote.signatureDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20">
            {React.createElement(SignatureCanvas as React.ComponentType<{ ref?: React.RefCallback<{ clear: () => void; toDataURL: () => string; isEmpty: () => boolean } | null>; canvasProps?: { className?: string }; backgroundColor?: string }>, {
              ref: (el: { clear: () => void; toDataURL: () => string; isEmpty: () => boolean } | null) => {
                sigRef.current = el
              },
              canvasProps: { className: 'w-full h-40 cursor-crosshair' },
              backgroundColor: 'rgb(250, 250, 250)',
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => sigRef.current?.clear()}
            >
              {t('promissoryNote.clear')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="mb-4 text-sm text-destructive">{error}</p>
      )}

      <Button
        size="lg"
        className="w-full"
        disabled={!allChecked || signing}
        onClick={handleSign}
      >
        {signing ? (
          <Loader2 className="ms-2 h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="ms-2 h-4 w-4" />
        )}
        {t('promissoryNote.signAndContinue')}
      </Button>
    </main>
  )
}
