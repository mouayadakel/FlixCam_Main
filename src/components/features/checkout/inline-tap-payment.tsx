/**
 * Triggers checkout: calls create-session then redirects to TAP payment URL (or confirmation).
 * Shown inline on Step 3 (no separate /payment page).
 */

'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useCheckoutStore } from '@/lib/stores/checkout.store'
import { useCartStore } from '@/lib/stores/cart.store'
import { formatSar } from '@/lib/utils/format.utils'

interface InlineTapPaymentProps {
  totalAmount: number
  onError?: (message: string) => void
  className?: string
  /** Selected payment gateway slug (e.g. tap, moyasar). Sent to create-session. */
  gateway?: string
  disabled?: boolean
  canSubmit?: boolean
  blockedSubmitMessage?: string
}

function formatErrorWithRequestId(errorMessage: string, requestId?: string): string {
  if (!requestId || typeof requestId !== 'string') return errorMessage
  return `${errorMessage} (Ref: ${requestId})`
}

export function InlineTapPayment({
  totalAmount,
  onError,
  className,
  gateway,
  disabled = false,
  canSubmit = true,
  blockedSubmitMessage,
}: InlineTapPaymentProps) {
  const { t, locale } = useLocale()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const details = useCheckoutStore((s) => s.details)
  const formValues = useCheckoutStore((s) => s.formValues)
  const smsConfirmationOptIn = useCheckoutStore((s) => s.smsConfirmationOptIn)
  const whatsappConfirmationOptIn = useCheckoutStore((s) => s.whatsappConfirmationOptIn)
  const items = useCartStore((s) => s.items)
  const fetchCart = useCartStore((s) => s.fetchCart)

  const handleComplete = async () => {
    if (!canSubmit) {
      onError?.(blockedSubmitMessage || t('checkout.legalRequired'))
      return
    }

    const guestEmail = (formValues.guest_checkout_email as string) ?? details?.email ?? ''
    const contactName = details?.name || (formValues.receiver_name as string) || ''
    const contactPhone = details?.phone || (formValues.receiver_phone as string) || ''

    if (!contactName || !contactPhone || items.length === 0) {
      onError?.(t('checkout.completePrevious'))
      return
    }
    if (!session?.user?.id && !guestEmail.trim()) {
      onError?.(t('checkout.detailsEmail'))
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
            name: contactName,
            email: guestEmail,
            phone: contactPhone,
          },
          receiver: {
            name: (formValues.receiver_name as string) ?? contactName,
            idNumber: formValues.receiver_id_number as string | undefined,
            phone: (formValues.receiver_phone as string) ?? contactPhone,
            idPhotoUrl: formValues.receiver_id_photo as string | undefined,
          },
          fulfillmentMethod: details?.deliveryMethod,
          deliveryAddress: details?.deliveryAddress ?? undefined,
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
          checkoutFormData: {
            ...formValues,
            sms_confirmation_opt_in: smsConfirmationOptIn,
            whatsapp_confirmation_opt_in: whatsappConfirmationOptIn,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const baseMessage =
          typeof data.error === 'string' && data.error.length > 0
            ? data.error
            : t('checkout.paymentSessionFailed')
        onError?.(formatErrorWithRequestId(baseMessage, data.requestId))
        setLoading(false)
        return
      }
      if (data.redirectUrl) {
        useCheckoutStore.getState().clearCheckout()
        window.location.href = data.redirectUrl
        return
      }
      if (data.bookingId && data.gateway === 'moyasar' && data.moyasar?.publishableKey) {
        useCheckoutStore.getState().clearCheckout()
        window.location.href = `/checkout/moyasar/${data.bookingId}`
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
        disabled={disabled || loading || !details || items.length === 0}
        onClick={handleComplete}
      >
        {loading ? (
          <>
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
            {t('checkout.processing')}
          </>
        ) : (
          `${t('checkout.completeBooking')} – ${formatSar(totalAmount, locale)}`
        )}
      </Button>
    </div>
  )
}
