'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { CreditCard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/hooks/use-locale'
import { useCheckoutStore, type CheckoutState } from '@/lib/stores/checkout.store'
import { useCartStore, type CartState } from '@/lib/stores/cart.store'
import {
  assertMoyasarCheckoutChargeHalalah,
  coerceMoyasarAmountHalalah,
  sarToMoyasarHalalah,
} from '@/lib/utils/moyasar-amount'
import { formatSar } from '@/lib/utils/format.utils'

interface InlineMoyasarPaymentProps {
  totalAmount: number
  onError?: (message: string) => void
  className?: string
  bookingId?: string
  disabled?: boolean
  canSubmit?: boolean
  blockedSubmitMessage?: string
}

interface MoyasarSessionPayload {
  publishableKey: string
  /** Integer halalah from server (1 SAR = 100); same as Moyasar API `amount` */
  amount: number
  currency: string
  callbackUrl: string
  description?: string
  metadata: Record<string, string>
}

/** Matches `BookingPayableBreakdown` from checkout-totals (server also sends this on session APIs). */
interface PaymentSummaryPayload {
  subtotalExVatSar: number
  vatSar: number
  grandTotalSar: number
  amountHalalah: number
}

interface RedirectSessionPayload {
  bookingId?: string
  redirectUrl: string
}

interface MoyasarPaymentResponse {
  id: string
  status: string
  source?: {
    message?: string
    transaction_url?: string
  }
}

interface MoyasarTokenResponse {
  id: string
  status: string
  message?: string
  verification_url?: string
}

interface CreateMoyasarPaymentApiError {
  error?: string
  requestId?: string
}

type MoyasarValidationErrorResponse = {
  message?: string
  errors?: Record<string, string[] | string | undefined>
}

function toBasicAuthHeader(apiKey: string): string {
  return `Basic ${btoa(`${apiKey}:`)}`
}

function normalizeCardNumber(value: string): string {
  return value.replace(/\s+/g, '')
}

function parseExpiry(value: string): { expiryYear: string; expiryMonth: string } {
  const normalized = value.replace(/\s+/g, '')
  const [monthPart = '', yearPart = ''] = normalized.split('/')
  const normalizedYear = yearPart.replace(/\D/g, '')
  return {
    expiryYear: normalizedYear.length > 2 ? normalizedYear.slice(-2) : normalizedYear.slice(0, 2),
    expiryMonth: monthPart.replace(/\D/g, '').slice(0, 2),
  }
}

function formatExpiryInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  const month = digits.slice(0, 2)
  const year = digits.slice(2, 4)
  if (!year) return month
  return `${month}/${year}`
}

function normalizeExpiryYear(value: string): number {
  const trimmed = value.trim()
  if (trimmed.length === 2) {
    return Number(`20${trimmed}`)
  }
  return Number(trimmed)
}

/** i18n key under `checkout.*` — translate with t() in the component */
function validateCardInput(input: {
  cardName: string
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvc: string
}): string | null {
  const number = normalizeCardNumber(input.cardNumber)
  const month = Number(input.expiryMonth)
  const year = normalizeExpiryYear(input.expiryYear)
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  if (!input.cardName.trim()) return 'checkout.cardValidationNameRequired'
  if (!/^\d{12,19}$/.test(number)) return 'checkout.cardValidationNumberDigits'
  if (!Number.isInteger(month) || month < 1 || month > 12) return 'checkout.cardValidationExpiryMonth'
  if (!Number.isInteger(year) || year < currentYear || year > currentYear + 25) {
    return 'checkout.cardValidationExpiryYear'
  }
  if (year === currentYear && month < currentMonth) return 'checkout.cardValidationExpired'
  if (!/^\d{3,4}$/.test(input.cvc.trim())) return 'checkout.cardValidationCvc'

  return null
}

function extractMoyasarValidationError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const data = payload as MoyasarValidationErrorResponse
  const errors = data.errors
  if (!errors || typeof errors !== 'object') {
    return typeof data.message === 'string' ? data.message : null
  }

  const messages: string[] = []
  for (const [field, value] of Object.entries(errors)) {
    if (!value) continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) {
          messages.push(`${field}: ${item}`)
        }
      }
      continue
    }
    if (typeof value === 'string' && value.trim()) {
      messages.push(`${field}: ${value}`)
    }
  }

  if (messages.length > 0) return messages.join(' | ')
  return typeof data.message === 'string' ? data.message : null
}

function formatErrorWithRequestId(errorMessage: string, requestId?: string): string {
  if (!requestId || typeof requestId !== 'string') return errorMessage
  return `${errorMessage} (Ref: ${requestId})`
}

export function InlineMoyasarPayment({
  totalAmount,
  onError,
  className,
  bookingId,
  disabled = false,
  canSubmit = true,
  blockedSubmitMessage,
}: InlineMoyasarPaymentProps) {
  const { t, dir, locale } = useLocale()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const details = useCheckoutStore((s: CheckoutState) => s.details)
  const formValues = useCheckoutStore((s: CheckoutState) => s.formValues)
  const smsConfirmationOptIn = useCheckoutStore((s: CheckoutState) => s.smsConfirmationOptIn)
  const whatsappConfirmationOptIn = useCheckoutStore((s: CheckoutState) => s.whatsappConfirmationOptIn)
  const items = useCartStore((s: CartState) => s.items)
  const { expiryMonth, expiryYear } = parseExpiry(expiry)
  const fallbackReceiverName = (formValues.receiver_name as string) ?? ''
  const fallbackReceiverPhone = (formValues.receiver_phone as string) ?? ''
  const fallbackGuestEmail =
    (formValues.guest_checkout_email as string) ?? details?.email ?? ''
  const hasCheckoutContact = Boolean(
    (details?.name?.trim() || fallbackReceiverName.trim()) &&
      (details?.phone?.trim() || fallbackReceiverPhone.trim()) &&
      (session?.user?.id || fallbackGuestEmail.trim())
  )

  const createSession = async (): Promise<
    | {
        bookingId: string
        moyasar: MoyasarSessionPayload
        paymentSummary?: PaymentSummaryPayload
      }
    | RedirectSessionPayload
  > => {
    if (bookingId) {
      const existingPaymentResponse = await fetch('/api/checkout/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, gateway: 'moyasar' }),
      })
      const existingPaymentPayload = await existingPaymentResponse.json().catch(() => ({}))
      if (!existingPaymentResponse.ok) {
        throw new Error(existingPaymentPayload.error || 'Failed to initialize payment')
      }
      if (
        typeof existingPaymentPayload?.redirectUrl === 'string' &&
        existingPaymentPayload.redirectUrl.length > 0
      ) {
        return existingPaymentPayload as RedirectSessionPayload
      }
      if (!existingPaymentPayload?.bookingId || !existingPaymentPayload?.moyasar?.publishableKey) {
        throw new Error('Invalid Moyasar session payload')
      }
      return existingPaymentPayload as {
        bookingId: string
        moyasar: MoyasarSessionPayload
        paymentSummary?: PaymentSummaryPayload
      }
    }

    const response = await fetch('/api/checkout/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gateway: 'moyasar',
        checkoutDetails: {
          name: details?.name || fallbackReceiverName,
          email: details?.email || fallbackGuestEmail,
          phone: details?.phone || fallbackReceiverPhone,
        },
        receiver: {
          name: (formValues.receiver_name as string) ?? details?.name ?? fallbackReceiverName,
          idNumber: formValues.receiver_id_number as string | undefined,
          phone: (formValues.receiver_phone as string) ?? details?.phone ?? fallbackReceiverPhone,
          idPhotoUrl: formValues.receiver_id_photo as string | undefined,
        },
        fulfillmentMethod:
          details?.deliveryMethod ||
          ((formValues.fulfillment_method as string | undefined)?.toUpperCase() === 'DELIVERY'
            ? 'DELIVERY'
            : 'PICKUP'),
        deliveryAddress:
          details?.deliveryAddress ??
          (((formValues.fulfillment_method as string | undefined)?.toUpperCase() === 'DELIVERY' &&
          ((formValues.delivery_address_street as string | undefined) ||
            (formValues.delivery_address_city as string | undefined))
            ? {
                city: (formValues.delivery_address_city as string) ?? '',
                street: (formValues.delivery_address_street as string) ?? '',
                notes: (formValues.delivery_address_map as { address?: string } | undefined)?.address,
              }
            : undefined)),
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

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const baseMessage =
        typeof payload.error === 'string' && payload.error.length > 0
          ? payload.error
          : t('checkout.paymentSessionFailed')
      throw new Error(formatErrorWithRequestId(baseMessage, payload.requestId))
    }
    if (typeof payload?.redirectUrl === 'string' && payload.redirectUrl.length > 0) {
      return payload as RedirectSessionPayload
    }
    if (!payload?.bookingId || !payload?.moyasar?.publishableKey) {
      throw new Error('Invalid Moyasar session payload')
    }

    return payload as {
      bookingId: string
      moyasar: MoyasarSessionPayload
      paymentSummary?: PaymentSummaryPayload
    }
  }

  /**
   * Tokenization must happen browser -> Moyasar directly. The final payment creation then
   * runs on our backend using the authoritative booking total.
   */
  const createMoyasarToken = async (
    sessionPayload: MoyasarSessionPayload
  ): Promise<MoyasarTokenResponse> => {
    const body = new URLSearchParams()
    body.set('name', cardName.trim())
    body.set('number', normalizeCardNumber(cardNumber))
    body.set('month', String(Number(expiryMonth)))
    body.set('year', expiryYear.trim())
    body.set('cvc', cvc.trim())
    body.set('callback_url', sessionPayload.callbackUrl)
    body.set('save_only', 'true')

    const response = await fetch('https://api.moyasar.com/v1/tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: toBasicAuthHeader(sessionPayload.publishableKey),
      },
      body: body.toString(),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(extractMoyasarValidationError(payload) || 'Moyasar tokenization failed')
    }

    return payload as MoyasarTokenResponse
  }

  const createMoyasarPayment = async (
    sessionPayload: MoyasarSessionPayload,
    tokenId: string
  ): Promise<MoyasarPaymentResponse> => {
    const rawAmount = sessionPayload.amount
    const amountHalalah = coerceMoyasarAmountHalalah(rawAmount)
    assertMoyasarCheckoutChargeHalalah(amountHalalah, 'createMoyasarPayment')

    console.info('[Moyasar] Initiating backend payment request', {
      bookingId: sessionPayload.metadata.booking_id,
      rawAmountHalalah: rawAmount,
      amountHalalah,
      amountSar: amountHalalah / 100,
      currency: sessionPayload.currency,
    })

    const response = await fetch('/api/checkout/moyasar/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: sessionPayload.metadata.booking_id,
        token: tokenId,
      }),
    })
    const payload = (await response.json().catch(() => ({}))) as
      | MoyasarPaymentResponse
      | CreateMoyasarPaymentApiError

    if (!response.ok) {
      const baseMessage =
        'error' in payload && typeof payload.error === 'string' && payload.error.length > 0
          ? payload.error
          : 'Moyasar payment request failed'
      throw new Error(
        formatErrorWithRequestId(
          baseMessage,
          'requestId' in payload ? payload.requestId : undefined
        )
      )
    }

    return payload as MoyasarPaymentResponse
  }

  const handlePay = async () => {
    if (!canSubmit) {
      onError?.(blockedSubmitMessage || t('checkout.legalRequired'))
      return
    }

    if (!bookingId && (items.length === 0 || !hasCheckoutContact)) {
      onError?.(t('checkout.completePrevious'))
      return
    }

    if (!cardName.trim() || !cardNumber.trim() || !expiry.trim() || !cvc.trim()) {
      onError?.(t('checkout.cardFieldsRequired'))
      return
    }

    const cardValidationKey = validateCardInput({
      cardName,
      cardNumber,
      expiryMonth,
      expiryYear,
      cvc,
    })
    if (cardValidationKey) {
      onError?.(t(cardValidationKey))
      return
    }

    setLoading(true)
    onError?.('')

    try {
      if (!bookingId) {
        // Sync with server so sidebar totals / button match what create-session + Moyasar will use
        await useCartStore.getState().fetchCart()
      }
      // Avoid `const { bookingId }` here: it would hoist/shadow the prop `bookingId` in this `try`
      // and cause TDZ (Cannot access before initialization) on `if (!bookingId)` above.
      const sessionPayload = await createSession()
      if ('redirectUrl' in sessionPayload) {
        useCheckoutStore.getState().clearCheckout()
        window.location.href = sessionPayload.redirectUrl
        return
      }

      const { bookingId: sessionBookingId, moyasar, paymentSummary } = sessionPayload
      assertMoyasarCheckoutChargeHalalah(moyasar.amount, 'Moyasar session (createSession response)')
      if (paymentSummary && paymentSummary.amountHalalah !== moyasar.amount) {
        throw new Error(
          'Payment amount out of sync with the server. Refresh the page and try again.'
        )
      }
      const uiHalalah = sarToMoyasarHalalah(totalAmount)
      if (Math.abs(moyasar.amount - uiHalalah) > 1) {
        throw new Error(
          'The total shown for your order does not match the charge amount from the server. Refresh the page and try again.'
        )
      }
      const token = await createMoyasarToken(moyasar)
      if (!token.id) {
        throw new Error(token.message || 'Moyasar tokenization failed')
      }
      const payment = await createMoyasarPayment(moyasar, token.id)

      if (payment.status === 'initiated' && payment.source?.transaction_url) {
        useCheckoutStore.getState().clearCheckout()
        window.location.href = payment.source.transaction_url
        return
      }

      if (payment.status === 'paid' || payment.status === 'captured') {
        useCheckoutStore.getState().clearCheckout()
        window.location.href = `/booking/confirmation/${sessionBookingId}`
        return
      }

      const sourceMessage = payment.source?.message || t('checkout.paymentNotCompleted')
      onError?.(sourceMessage)
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t('checkout.paymentSessionFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className} dir={dir}>
      <div className="w-[475px] rounded-xl border border-[#E5E7EB] bg-white p-5">
        <div className="my-5 border-b border-[#E5E7EB]" />

        <div className="space-y-4 ps-7">
          <div className="space-y-1">
            <Label htmlFor="moyasar-card-number" className="mb-1 block text-sm font-medium text-[#374151]">
              {t('checkout.cardNumberLabel')}
            </Label>
            <div className="relative">
              <Input
                id="moyasar-card-number"
                value={cardNumber}
                onChange={(event) => setCardNumber(event.target.value)}
                placeholder={t('checkout.cardNumberPlaceholder')}
                inputMode="numeric"
                autoComplete="cc-number"
                dir="ltr"
                className="h-11 rounded-lg border-[#E5E7EB] pe-10 text-start text-base text-[#374151] placeholder:text-gray-400"
              />
              <CreditCard className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="moyasar-card-name" className="mb-1 block text-sm font-medium text-[#374151]">
                {t('checkout.nameOnCardLabel')}
              </Label>
              <Input
                id="moyasar-card-name"
                value={cardName}
                onChange={(event) => setCardName(event.target.value)}
                placeholder={t('checkout.nameOnCardPlaceholder')}
                autoComplete="cc-name"
                className="h-11 rounded-lg border-[#E5E7EB] text-base text-[#374151] placeholder:text-gray-400"
              />
            </div>
            <div className="col-span-1 space-y-1">
              <Label htmlFor="moyasar-card-expiry" className="mb-1 block text-sm font-medium text-[#374151]">
                {t('checkout.expireDateLabel')}
              </Label>
              <Input
                id="moyasar-card-expiry"
                value={expiry}
                onChange={(event) => setExpiry(formatExpiryInput(event.target.value))}
                placeholder={t('checkout.expireDatePlaceholder')}
                inputMode="numeric"
                autoComplete="cc-exp"
                dir="ltr"
                className="h-11 rounded-lg border-[#E5E7EB] text-start text-base text-[#374151] placeholder:text-gray-400"
              />
            </div>
            <div className="col-span-1 space-y-1">
              <Label htmlFor="moyasar-card-cvc" className="mb-1 block text-sm font-medium text-[#374151]">
                {t('checkout.cvvLabel')}
              </Label>
              <Input
                id="moyasar-card-cvc"
                value={cvc}
                onChange={(event) => setCvc(event.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder={t('checkout.cvvPlaceholder')}
                inputMode="numeric"
                autoComplete="cc-csc"
                dir="ltr"
                className="h-11 rounded-lg border-[#E5E7EB] text-start text-base text-[#374151] placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>
      </div>
      <Button
        type="button"
        size="lg"
        className="mt-4 w-full font-semibold"
        disabled={disabled || loading || (!bookingId && (items.length === 0 || !hasCheckoutContact))}
        onClick={handlePay}
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
