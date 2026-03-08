/**
 * Checkout Step 1: Receiver & Fulfillment.
 * Uses DynamicFormRenderer (step 1) + custom saved receiver selector + optional "Myself" auto-fill.
 */

'use client'

import { useEffect, useCallback, useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { useCheckoutStore } from '@/lib/stores/checkout.store'
import { DynamicFormRenderer, type CustomFieldRender } from './dynamic-form-renderer'
import { SavedReceiverSelector } from './saved-receiver-selector'

const SAUDI_PHONE_REGEX = /^(05\d{8}|9665\d{8})$/

interface CheckoutStepReceiverProps {
  onSuccess: () => void
}

export function CheckoutStepReceiver({ onSuccess }: CheckoutStepReceiverProps) {
  const { t } = useLocale()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const formValues = useCheckoutStore((s) => s.formValues)
  const setFormValues = useCheckoutStore((s) => s.setFormValues)
  const setDetails = useCheckoutStore((s) => s.setDetails)
  const setFulfillment = useCheckoutStore((s) => s.setFulfillment)

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

    return errs
  }, [formValues, t])

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

    const method = (formValues.fulfillment_method as string) || 'PICKUP'
    setFulfillment({
      method: method === 'delivery' ? 'DELIVERY' : 'PICKUP',
      address:
        method === 'delivery' && formValues.delivery_address_map
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
      email: '',
      phone,
      deliveryMethod: method === 'delivery' ? 'DELIVERY' : 'PICKUP',
      deliveryAddress:
        method === 'delivery' && formValues.delivery_address_street
          ? {
              city: (formValues.delivery_address_city as string) ?? '',
              street: (formValues.delivery_address_street as string) ?? '',
              notes: (formValues.delivery_address_map as { address?: string })?.address,
            }
          : null,
    })
    onSuccess()
  }

  return (
    <div className="rounded-lg border bg-card p-6 pb-24 lg:pb-6">
      <DynamicFormRenderer
        step={1}
        values={formValues}
        onChange={setFormValues}
        errors={errors}
        customFieldRender={customFieldRender}
        className="space-y-6"
      />
      <div className="fixed bottom-0 start-0 end-0 z-20 border-t bg-background p-4 lg:static lg:border-0 lg:p-0 lg:mt-6">
        <Button type="button" size="lg" className="w-full" onClick={() => void handleContinue()}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  )
}
