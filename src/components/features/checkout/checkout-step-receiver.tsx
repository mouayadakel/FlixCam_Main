/**
 * Checkout Step 1: Receiver & Fulfillment.
 * Uses DynamicFormRenderer (step 1) + custom saved receiver selector + optional "Myself" auto-fill.
 */

'use client'

import { useEffect, useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EMBED_LTR } from '@/lib/i18n/bidi'
import { useCheckoutStore } from '@/lib/stores/checkout.store'
import { DynamicFormRenderer, type CustomFieldRender } from './dynamic-form-renderer'
import { SavedReceiverSelector } from './saved-receiver-selector'
import { Expand } from 'lucide-react'

const SAUDI_PHONE_REGEX = /^(05\d{8}|9665\d{8})$/
const RECEIVER_PROFILE_STORAGE_KEY = 'flixcam-checkout-receiver-profile-v1'
const RECEIVER_PROFILE_FIELDS = [
  'receiver_type',
  'receiver_name',
  'receiver_phone',
  'receiver_id_number',
  'receiver_id_photo',
  'guest_checkout_email',
  'fulfillment_method',
  'delivery_address_city',
  'delivery_address_street',
  'delivery_address_map',
  'legal_agreement',
] as const

interface CheckoutStepReceiverProps {
  onSuccess?: () => void
  showContinueButton?: boolean
}

export function CheckoutStepReceiver({
  onSuccess,
  showContinueButton = true,
}: CheckoutStepReceiverProps) {
  const { t } = useLocale()
  const { data: session } = useSession()
  const isGuestCheckout = !session?.user?.id
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasSavedProfile, setHasSavedProfile] = useState(false)
  const formValues = useCheckoutStore((s) => s.formValues)
  const setFormValues = useCheckoutStore((s) => s.setFormValues)
  const setDetails = useCheckoutStore((s) => s.setDetails)
  const setFulfillment = useCheckoutStore((s) => s.setFulfillment)

  const resolveDeliveryMethod = (method: unknown): 'DELIVERY' | 'PICKUP' => {
    if (typeof method !== 'string') return 'PICKUP'
    return method.toUpperCase() === 'DELIVERY' ? 'DELIVERY' : 'PICKUP'
  }

  // On first entry, prefill this step from last saved receiver profile.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hasAnyCurrentValue = RECEIVER_PROFILE_FIELDS.some((key) => {
      const value = formValues[key]
      return value !== undefined && value !== null && value !== ''
    })
    if (hasAnyCurrentValue) return

    try {
      const raw = window.localStorage.getItem(RECEIVER_PROFILE_STORAGE_KEY)
      setHasSavedProfile(Boolean(raw))
      if (!raw) return
      const saved = JSON.parse(raw) as Record<string, unknown>
      if (!saved || typeof saved !== 'object') return
      setFormValues({
        ...formValues,
        ...saved,
      })
    } catch {
      // Ignore invalid storage payloads and continue with blank state.
      setHasSavedProfile(false)
    }
    // intentionally run once when component mounts
  }, [])

  // Auto-save this section so returning customers can reuse it next time.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const payload = RECEIVER_PROFILE_FIELDS.reduce<Record<string, unknown>>((acc, key) => {
        const value = formValues[key]
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = value
        }
        return acc
      }, {})

      if (Object.keys(payload).length === 0) return
      window.localStorage.setItem(RECEIVER_PROFILE_STORAGE_KEY, JSON.stringify(payload))
      setHasSavedProfile(true)
    } catch {
      // Ignore storage quota/serialization errors.
    }
  }, [formValues])

  const applySavedReceiverProfile = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(RECEIVER_PROFILE_STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as Record<string, unknown>
      if (!saved || typeof saved !== 'object') return
      const prev = useCheckoutStore.getState().formValues
      setFormValues({
        ...prev,
        ...saved,
      })
      setHasSavedProfile(true)
    } catch {
      // Ignore invalid storage payloads.
    }
  }, [setFormValues])

  const clearSavedReceiverProfile = useCallback(() => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(RECEIVER_PROFILE_STORAGE_KEY)
    setHasSavedProfile(false)
  }, [])

  // Auto-fill "Myself" from profile when receiver_type is myself
  useEffect(() => {
    const receiverType = formValues.receiver_type as string | undefined
    if (receiverType !== 'myself') return
    let cancelled = false
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((me: { name?: string | null; phone?: string | null } | null) => {
        if (cancelled || !me) return
        setFormValues({
          ...formValues,
          receiver_name: me.name ?? '',
          receiver_phone: me.phone ?? '',
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [formValues.receiver_type])

  // In cart inline mode there is no "Continue" action, so keep checkout details synced
  // from the current form values to avoid blocking payment submission.
  useEffect(() => {
    if (showContinueButton) return

    const resolvedMethod = resolveDeliveryMethod(formValues.fulfillment_method)
    const city = (formValues.delivery_address_city as string) ?? ''
    const street = (formValues.delivery_address_street as string) ?? ''
    const notes = (formValues.delivery_address_map as { address?: string } | undefined)?.address
    const hasDeliveryAddress = resolvedMethod === 'DELIVERY' && (street || city || notes)

    setFulfillment({
      method: resolvedMethod,
      address: hasDeliveryAddress
        ? {
            city,
            street,
            notes,
          }
        : undefined,
    })

    const name = (formValues.receiver_name as string) || ''
    const phone = (formValues.receiver_phone as string) || ''
    const email = isGuestCheckout ? ((formValues.guest_checkout_email as string) || '') : ''
    setDetails({
      name,
      email,
      phone,
      deliveryMethod: resolvedMethod,
      deliveryAddress: hasDeliveryAddress
        ? {
            city,
            street,
            notes,
          }
        : null,
    })
  }, [formValues, isGuestCheckout, setDetails, setFulfillment, showContinueButton])

  const customFieldRender: CustomFieldRender = useCallback(
    (field, value, onChange) => {
      if (field.fieldKey === 'receiver_saved_select') {
        return (
          <SavedReceiverSelector
            value={(value as string) ?? null}
            onChange={(receiverId, receiver) => {
              onChange('receiver_saved_select', receiverId ?? '')
              if (receiver) {
                const prev = useCheckoutStore.getState().formValues
                setFormValues({
                  ...prev,
                  receiver_saved_select: receiverId,
                  receiver_name: receiver.name,
                  receiver_id_number: receiver.idNumber,
                  receiver_phone: receiver.phone,
                  receiver_id_photo: receiver.idPhotoUrl,
                })
              }
            }}
            label={field.labelEn}
          />
        )
      }
      return null
    },
    [setFormValues]
  )

  const validateStep1 = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {}
    const receiverType = formValues.receiver_type as string | undefined
    const name = (formValues.receiver_name as string)?.trim() ?? ''
    const phone = (formValues.receiver_phone as string)?.trim() ?? ''
    const idPhoto = formValues.receiver_id_photo as string | undefined
    const method = (formValues.fulfillment_method as string) || 'PICKUP'
    const mapVal = formValues.delivery_address_map as { lat?: number; lng?: number } | undefined
    const legalAgreement = formValues.legal_agreement

    if (receiverType === 'myself') {
      if (name.length < 2) errs.receiver_name = t('checkout.nameMinLength') ?? 'Name must be at least 2 characters'
      if (!SAUDI_PHONE_REGEX.test(phone)) errs.receiver_phone = t('checkout.invalidPhone') ?? 'Invalid Saudi phone number'
    } else {
      if (name.length < 2) errs.receiver_name = t('checkout.nameMinLength') ?? 'Name must be at least 2 characters'
      if (!SAUDI_PHONE_REGEX.test(phone)) errs.receiver_phone = t('checkout.invalidPhone') ?? 'Invalid Saudi phone number'
    }

    if (!idPhoto?.trim()) errs.receiver_id_photo = t('checkout.idPhotoRequired') ?? 'ID photo is required'

    if (method === 'delivery' && (!mapVal?.lat || !mapVal?.lng)) {
      errs.delivery_address_map = t('checkout.addressRequired') ?? 'Please select an address on the map'
    }

    if (!legalAgreement) errs.legal_agreement = t('checkout.legalRequired') ?? 'You must accept the terms'

    if (isGuestCheckout) {
      const email = ((formValues.guest_checkout_email as string) ?? '').trim()
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errs.guest_checkout_email = t('checkout.detailsEmail') ?? 'Valid email is required'
      }
    }

    return errs
  }, [formValues, isGuestCheckout, t])

  const handleContinue = async () => {
    const errs = validateStep1()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})

    const res = await fetch('/api/checkout/validate-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 1, formValues }),
    })
    const data = await res.json().catch(() => ({}))
    if (!data.valid && data.errors && Object.keys(data.errors).length > 0) {
      setErrors(data.errors)
      return
    }

    const method = resolveDeliveryMethod(formValues.fulfillment_method)
    setFulfillment({
      method,
      address:
        method === 'DELIVERY' && formValues.delivery_address_map
          ? {
              city: (formValues.delivery_address_city as string) ?? '',
              street: (formValues.delivery_address_street as string) ?? '',
              notes: (formValues.delivery_address_map as { address?: string })?.address,
            }
          : undefined,
    })
    const name = (formValues.receiver_name as string) || (formValues.receiver_type === 'myself' ? '' : '')
    const phone = (formValues.receiver_phone as string) || ''
    setDetails({
      name,
      email: isGuestCheckout ? ((formValues.guest_checkout_email as string) || '') : '',
      phone,
      deliveryMethod: method,
      deliveryAddress:
        method === 'DELIVERY' && formValues.delivery_address_street
          ? {
              city: (formValues.delivery_address_city as string) ?? '',
              street: (formValues.delivery_address_street as string) ?? '',
              notes: (formValues.delivery_address_map as { address?: string })?.address,
            }
          : null,
    })
    onSuccess?.()
  }

  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white shadow-2xl shadow-purple-500/10">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 pb-4 pt-6">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#FF5F56]" />
          <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
          <span className="h-3 w-3 rounded-full bg-[#27C93F]" />
        </div>
        <span className="rounded-full border border-gray-200 p-2 text-gray-500">
          <Expand className="h-4 w-4" />
        </span>
      </div>
      <div className="p-6 pb-24 lg:pb-6">
      {isGuestCheckout && (
        <div className="mb-6">
          <Label htmlFor="guest_checkout_email">{t('checkout.detailsEmail')}</Label>
          <Input
            id="guest_checkout_email"
            type="email"
            dir={EMBED_LTR}
            value={(formValues.guest_checkout_email as string) ?? ''}
            onChange={(event) =>
              setFormValues({ ...formValues, guest_checkout_email: event.target.value })
            }
            className="mt-1 h-12 text-base"
            placeholder="name@example.com"
          />
          {errors.guest_checkout_email && (
            <p className="mt-1 text-sm text-destructive">{errors.guest_checkout_email}</p>
          )}
        </div>
      )}
      <DynamicFormRenderer
        step={1}
        values={formValues}
        onChange={setFormValues}
        errors={errors}
        customFieldRender={customFieldRender}
        className="space-y-6"
      />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={applySavedReceiverProfile}
          disabled={!hasSavedProfile}
          className="rounded-xl border-[#E5E7EB] bg-white"
        >
          {t('checkout.useSavedReceiverInfo')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearSavedReceiverProfile}
          disabled={!hasSavedProfile}
          className="rounded-xl"
        >
          {t('checkout.clearSavedReceiverInfo')}
        </Button>
      </div>
      {showContinueButton && (
        <div className="fixed bottom-0 start-0 end-0 z-20 border-t bg-background p-4 lg:static lg:border-0 lg:p-0 lg:mt-6">
          <Button
            type="button"
            size="lg"
            className="w-full rounded-xl bg-[#7C3AED] font-bold text-white hover:bg-[#6D28D9]"
            onClick={() => void handleContinue()}
          >
            {t('common.next')}
          </Button>
        </div>
      )}
      </div>
    </div>
  )
}
