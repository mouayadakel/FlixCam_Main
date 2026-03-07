/**
 * Checkout Step 2: Profile + delivery (Phase 3.3).
 */

'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  checkoutDetailsSchema,
  type CheckoutDetailsInput,
} from '@/lib/validators/checkout.validator'
import {
  useCheckoutStore,
  type CheckoutDetails,
  type DeliveryAddress,
} from '@/lib/stores/checkout.store'
import { Loader2 } from 'lucide-react'

interface CheckoutStepDetailsProps {
  onSuccess: () => void
}

export function CheckoutStepDetails({ onSuccess }: CheckoutStepDetailsProps) {
  const { t } = useLocale()
  const { toast } = useToast()
  const setDetails = useCheckoutStore((s) => s.setDetails)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const form = useForm<CheckoutDetailsInput>({
    resolver: zodResolver(checkoutDetailsSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      deliveryMethod: 'PICKUP',
      deliveryCity: '',
      deliveryStreet: '',
      deliveryNotes: '',
    },
  })

  const deliveryMethod = form.watch('deliveryMethod')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/me')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          form.reset({
            name: data.name ?? '',
            email: data.email ?? '',
            phone: data.phone ?? '',
            deliveryMethod: 'PICKUP',
            deliveryCity: '',
            deliveryStreet: '',
            deliveryNotes: '',
          })
        }
      } finally {
        if (!cancelled) setLoadingProfile(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [form])

  const onSubmit = async (data: CheckoutDetailsInput) => {
    try {
      await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, phone: data.phone }),
      })

      const details: CheckoutDetails = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        deliveryMethod: data.deliveryMethod as 'PICKUP' | 'DELIVERY',
        deliveryAddress:
          data.deliveryMethod === 'DELIVERY' && data.deliveryCity && data.deliveryStreet
            ? ({
                city: data.deliveryCity,
                street: data.deliveryStreet,
                notes: data.deliveryNotes ?? undefined,
              } as DeliveryAddress)
            : null,
      }
      setDetails(details)
      toast({ title: t('checkout.detailsSaved'), description: t('checkout.detailsSavedDesc') })
      onSuccess()
    } catch {
      toast({
        title: t('common.error'),
        description: t('checkout.detailsSaveFailed'),
        variant: 'destructive',
      })
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border bg-card p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-1">
          <div>
            <Label htmlFor="name">{t('checkout.detailsName')}</Label>
            <Input id="name" {...form.register('name')} className="mt-1 h-12 text-base" />
            {form.formState.errors.name && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">{t('checkout.detailsEmail')}</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              {...form.register('email')}
              className="mt-1 h-12 text-base"
            />
            {form.formState.errors.email && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="phone">{t('checkout.detailsPhone')}</Label>
            <Input
              id="phone"
              type="tel"
              dir="ltr"
              placeholder="05XXXXXXXX"
              {...form.register('phone')}
              className="mt-1 h-12 text-base"
            />
            {form.formState.errors.phone && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.phone.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Label>{t('checkout.deliveryMethod')}</Label>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                value="PICKUP"
                {...form.register('deliveryMethod')}
                className="rounded-full border-input"
              />
              <span>{t('checkout.deliveryPickup')}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                value="DELIVERY"
                {...form.register('deliveryMethod')}
                className="rounded-full border-input"
              />
              <span>{t('checkout.deliveryDelivery')}</span>
            </label>
          </div>
        </div>

        {deliveryMethod === 'DELIVERY' && (
          <div className="grid gap-4 rounded-md border bg-muted/30 p-4">
            <div>
              <Label htmlFor="deliveryCity">{t('checkout.deliveryCity')}</Label>
              <Input
                id="deliveryCity"
                {...form.register('deliveryCity')}
                className="mt-1 h-12 text-base"
              />
            </div>
            <div>
              <Label htmlFor="deliveryStreet">{t('checkout.deliveryStreet')}</Label>
              <Input
                id="deliveryStreet"
                {...form.register('deliveryStreet')}
                className="mt-1 h-12 text-base"
              />
              {form.formState.errors.deliveryStreet && (
                <p className="mt-1 text-sm text-destructive">
                  {form.formState.errors.deliveryStreet.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="deliveryNotes">{t('checkout.deliveryNotes')}</Label>
              <Input
                id="deliveryNotes"
                {...form.register('deliveryNotes')}
                className="mt-1 h-12 text-base"
              />
            </div>
          </div>
        )}

        <Button type="submit" className="w-full" size="lg">
          {t('checkout.continueToReview')}
        </Button>
      </form>
    </div>
  )
}
