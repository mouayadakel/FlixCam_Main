/**
 * Triggers checkout: calls create-session then redirects to TAP payment URL (or confirmation).
 * Shown inline on Step 3 (no separate /payment page).
 */

'use client'

import { useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useCheckoutStore } from '@/lib/stores/checkout.store'
import { useCartStore } from '@/lib/stores/cart.store'

const VAT_RATE = 0.15

function formatSar(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

interface InlineTapPaymentProps {
  totalAmount: number
  onError?: (message: string) => void
  className?: string
  /** Selected payment gateway slug (e.g. tap, moyasar). Sent to create-session. */
  gateway?: string
}

export function InlineTapPayment({
  totalAmount,
  onError,
  className,
  gateway,
}: InlineTapPaymentProps) {
  const { t } = useLocale()
  const [loading, setLoading] = useState(false)
  const details = useCheckoutStore((s) => s.details)
  const formValues = useCheckoutStore((s) => s.formValues)
  const items = useCartStore((s) => s.items)
  const fetchCart = useCartStore((s) => s.fetchCart)

  const handleComplete = async () => {
    if (!details || items.length === 0) {
      onError?.(t('checkout.completePrevious'))
      return
    }
    setLoading(true)
    onError?.('')
    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(gateway && { gateway }),
          checkoutDetails: {
            name: details.name,
            email: details.email,
            phone: details.phone,
          },
          receiver: {
            name: (formValues.receiver_name as string) ?? details.name,
            idNumber: formValues.receiver_id_number as string | undefined,
            phone: (formValues.receiver_phone as string) ?? details.phone,
            idPhotoUrl: formValues.receiver_id_photo as string | undefined,
          },
          fulfillmentMethod: details.deliveryMethod,
          deliveryAddress: details.deliveryAddress ?? undefined,
          deliveryLat: (formValues.delivery_address_map as { lat?: number })?.lat,
          deliveryLng: (formValues.delivery_address_map as { lng?: number })?.lng,
          preferredTimeSlot: formValues.preferred_time_slot as string | undefined,
          emergencyContact: formValues.emergency_name
            ? {
                name: formValues.emergency_name as string,
                phone: formValues.emergency_phone as string | undefined,
                relation: formValues.emergency_relation as string | undefined,
              }
            : undefined,
          checkoutFormData: formValues,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        onError?.(data.error || t('checkout.paymentSessionFailed'))
        setLoading(false)
        return
      }
      if (data.redirectUrl) {
        useCheckoutStore.getState().clearCheckout()
        window.location.href = data.redirectUrl
        return
      }
      if (data.bookingId) {
        useCheckoutStore.getState().clearCheckout()
        window.location.href = `/booking/confirmation/${data.bookingId}`
        return
      }
      onError?.(t('checkout.paymentSessionFailed'))
    } catch (e) {
      onError?.(e instanceof Error ? e.message : t('checkout.paymentSessionFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        size="lg"
        className="w-full font-semibold"
        disabled={loading || !details || items.length === 0}
        onClick={handleComplete}
      >
        {loading ? (
          <>
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
            {t('checkout.processing')}
          </>
        ) : (
          `${t('checkout.completeBooking')} – ${formatSar(totalAmount)}`
        )}
      </Button>
    </div>
  )
}
