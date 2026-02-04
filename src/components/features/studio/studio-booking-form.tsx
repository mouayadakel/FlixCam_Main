/**
 * Studio booking form: slot picker + duration + add to cart (Phase 2.4).
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { StudioSlotPicker } from './studio-slot-picker'

interface StudioBookingFormProps {
  studioSlug: string
  hourlyRate: number
}

export function StudioBookingForm({ studioSlug, hourlyRate }: StudioBookingFormProps) {
  const { t } = useLocale()
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState<{ start: string; end: string } | null>(null)
  const [durationHours, setDurationHours] = useState(1)

  const total = slot ? hourlyRate * durationHours : 0
  const canAdd = date && slot && durationHours >= 1

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="font-semibold">Book this studio</h3>
      <StudioSlotPicker
        studioSlug={studioSlug}
        selectedDate={date}
        selectedSlot={slot}
        onDateChange={setDate}
        onSlotSelect={setSlot}
      />
      {slot && (
        <div>
          <label className="text-sm font-medium block mb-1">Duration (hours)</label>
          <select
            value={durationHours}
            onChange={(e) => setDurationHours(parseInt(e.target.value, 10))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? 'hour' : 'hours'}
              </option>
            ))}
          </select>
        </div>
      )}
      {total > 0 && (
        <p className="text-sm font-medium">
          Total: {total.toLocaleString()} SAR
        </p>
      )}
      <Button asChild size="lg" disabled={!canAdd}>
        <Link href={canAdd ? `/cart?studio=${studioSlug}&date=${date}&start=${slot?.start}&duration=${durationHours}` : '#'}>
          {t('common.addToCart')}
        </Link>
      </Button>
    </div>
  )
}
