'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { InlineMoyasarPayment } from '@/components/features/checkout/inline-moyasar-payment'
import { CheckoutProgressHeader } from '@/components/features/checkout/checkout-progress-header'
import { formatSar } from '@/lib/utils/format.utils'

type PaymentSummary = {
  subtotalExVatSar: number
  vatSar: number
  grandTotalSar: number
  amountHalalah: number
}

type BookingWithPayment = {
  totalAmount?: unknown
  vatAmount?: unknown
  paymentSummary?: PaymentSummary
}

export default function MoyasarBookingPaymentPage() {
  const params = useParams<{ bookingId: string }>()
  const bookingId = params?.bookingId
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!bookingId) return
    fetch(`/api/bookings/${bookingId}`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load booking')
        return response.json() as Promise<BookingWithPayment>
      })
      .then((payload) => {
        if (payload.paymentSummary) {
          setSummary(payload.paymentSummary)
        } else {
          setLoadError('Missing payment summary')
        }
      })
      .catch((fetchError) => {
        setLoadError(fetchError instanceof Error ? fetchError.message : 'Failed to load booking')
      })
  }, [bookingId])

  if (!bookingId) return null

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6 bg-[#F9FAFB]">
        <CheckoutProgressHeader />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <section className="space-y-4 lg:col-span-3">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
              <h1 className="text-2xl font-bold text-[#111827]">Complete payment</h1>
              <p className="mt-2 text-sm text-[#6B7280]">
                Enter your card details to complete this booking payment through Moyasar.
              </p>

              <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#FBFBFF] p-4">
                {loadError ? (
                  <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    {loadError}
                  </p>
                ) : !summary ? (
                  <p className="text-sm text-[#6B7280]">Loading…</p>
                ) : (
                  <InlineMoyasarPayment
                    bookingId={bookingId}
                    totalAmount={summary.grandTotalSar}
                    onError={setError}
                  />
                )}
                {error && (
                  <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </section>

          <aside className="lg:col-span-2">
            <div className="rounded-xl border border-[#E5E7EB] bg-gradient-to-br from-white to-[#f6f3ff] p-6 shadow-lg">
              <h2 className="text-lg font-bold text-[#111827]">Payment Summary</h2>
              <p className="mt-1 text-xs text-[#6B7280]">Booking ID: {bookingId}</p>

              {!summary ? (
                <p className="mt-5 text-sm text-[#6B7280]">…</p>
              ) : (
                <dl className="mt-5 space-y-2 text-sm">
                  <div className="flex justify-between text-[#6B7280]">
                    <dt>Subtotal (ex. VAT)</dt>
                    <dd>{formatSar(summary.subtotalExVatSar, 'en-SA')}</dd>
                  </div>
                  <div className="flex justify-between text-[#6B7280]">
                    <dt>VAT (15%)</dt>
                    <dd>{formatSar(summary.vatSar, 'en-SA')}</dd>
                  </div>
                  <div className="flex justify-between border-t border-[#E5E7EB] pt-2 text-lg font-bold text-[#111827]">
                    <dt>Total due</dt>
                    <dd>{formatSar(summary.grandTotalSar, 'en-SA')}</dd>
                  </div>
                </dl>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
