/**
 * Checkout Step 1: Receiver & Fulfillment.
 * Uses DynamicFormRenderer (step 1) + custom saved receiver selector + optional "Myself" auto-fill.
 */

'use client'

import { useEffect, useCallback } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { useCheckoutStore } from '@/lib/stores/checkout.store'
import { DynamicFormRenderer, type CustomFieldRender } from './dynamic-form-renderer'
import { SavedReceiverSelector, type SavedReceiver } from './saved-receiver-selector'

interface CheckoutStepReceiverProps {
  onSuccess: () => void
}

export function CheckoutStepReceiver({ onSuccess }: CheckoutStepReceiverProps) {
  const { t } = useLocale()
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

  const handleContinue = () => {
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
    <div className="rounded-lg border bg-card p-6">
      <DynamicFormRenderer
        step={1}
        values={formValues}
        onChange={setFormValues}
        customFieldRender={customFieldRender}
        className="space-y-6"
      />
      <div className="mt-6">
        <Button type="button" size="lg" className="w-full" onClick={handleContinue}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  )
}
