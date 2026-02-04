/**
 * Studio slot picker: date + available slots (Phase 2.4).
 */

'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'

interface StudioSlotPickerProps {
  studioSlug: string
  selectedDate: string
  selectedSlot: { start: string; end: string } | null
  onDateChange: (date: string) => void
  onSlotSelect: (slot: { start: string; end: string }) => void
}

export function StudioSlotPicker({
  studioSlug,
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotSelect,
}: StudioSlotPickerProps) {
  const { t } = useLocale()
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedDate) {
      setSlots([])
      return
    }
    setLoading(true)
    fetch(`/api/public/studios/${studioSlug}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate }),
    })
      .then((r) => r.json())
      .then((res) => {
        setSlots(Array.isArray(res?.data) ? res.data : [])
      })
      .catch(() => setSlots([]))
      .finally(() => setLoading(false))
  }, [studioSlug, selectedDate])

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().slice(0, 10)

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium block mb-1">Date</label>
        <input
          type="date"
          min={minDate}
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {selectedDate && (
        <div>
          <label className="text-sm font-medium block mb-2">Available times</label>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('common.unavailable')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <Button
                  key={slot.start}
                  type="button"
                  variant={selectedSlot?.start === slot.start ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSlotSelect(slot)}
                >
                  {formatTime(slot.start)} - {formatTime(slot.end)}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
