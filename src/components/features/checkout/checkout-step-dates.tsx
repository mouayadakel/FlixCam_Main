/**
 * Checkout Step 1: Dates + Fulfillment (pickup/delivery, date range, branch/delivery zone).
 */

'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { useCartStore } from '@/lib/stores/cart.store'
import { useCheckoutStore } from '@/lib/stores/checkout.store'

interface CheckoutStepDatesProps {
  onSuccess: () => void
}

function getDefaultDates() {
  const start = new Date()
  start.setDate(start.getDate() + 1)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) }
}

export function CheckoutStepDates({ onSuccess }: CheckoutStepDatesProps) {
  const { t } = useLocale()
  const items = useCartStore((s) => s.items)
  const setDates = useCheckoutStore((s) => s.setDates)
  const setFulfillment = useCheckoutStore((s) => s.setFulfillment)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [method, setMethod] = useState<'PICKUP' | 'DELIVERY'>('PICKUP')
  const [city, setCity] = useState('')
  const [street, setStreet] = useState('')

  useEffect(() => {
    const fromCart = items[0]
    if (fromCart?.startDate && fromCart?.endDate) {
      setStartDate(fromCart.startDate.slice(0, 10))
      setEndDate(fromCart.endDate.slice(0, 10))
    } else {
      const d = getDefaultDates()
      setStartDate(d.startDate)
      setEndDate(d.endDate)
    }
  }, [items])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setDates({ startDate, endDate })
    setFulfillment({
      method,
      address: method === 'DELIVERY' && city && street ? { city, street } : undefined,
    })
    onSuccess()
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          startLabel={t('checkout.startDate')}
          endLabel={t('checkout.endDate')}
          minStart={new Date().toISOString().slice(0, 10)}
        />
        <div className="space-y-3">
          <Label>{t('checkout.deliveryMethod')}</Label>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="method"
                checked={method === 'PICKUP'}
                onChange={() => setMethod('PICKUP')}
                className="rounded-full border-input"
              />
              <span>{t('checkout.deliveryPickup')}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="method"
                checked={method === 'DELIVERY'}
                onChange={() => setMethod('DELIVERY')}
                className="rounded-full border-input"
              />
              <span>{t('checkout.deliveryDelivery')}</span>
            </label>
          </div>
        </div>
        {method === 'DELIVERY' && (
          <div className="grid gap-4 rounded-md border bg-muted/30 p-4">
            <div>
              <Label htmlFor="deliveryCity">{t('checkout.deliveryCity')}</Label>
              <Input id="deliveryCity" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="deliveryStreet">{t('checkout.deliveryStreet')}</Label>
              <Input id="deliveryStreet" value={street} onChange={(e) => setStreet(e.target.value)} className="mt-1" />
            </div>
          </div>
        )}
        <Button type="submit" size="lg" className="w-full">
          {t('common.next')}
        </Button>
      </form>
    </div>
  )
}
