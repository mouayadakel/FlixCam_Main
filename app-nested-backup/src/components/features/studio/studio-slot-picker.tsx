/**
 * Studio slot picker: date + available slots (Phase 2.4).
 */

'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { CalendarDays, Clock, Loader2 } from 'lucide-react'

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

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-text-heading">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          {t('studios.selectDate')}
        </label>
        <input
          type="date"
          min={minDate}
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          aria-label="اختر التاريخ"
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm transition-shadow focus:shadow-card-elevated focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      {selectedDate && (
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-text-heading">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {t('studios.availableTimes')}
          </label>
          {loading ? (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading')}
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-xl bg-surface-light p-3 text-center text-sm text-text-muted">
              {t('common.unavailable')}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <Button
                  key={slot.start}
                  type="button"
                  variant={selectedSlot?.start === slot.start ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSlotSelect(slot)}
                  className={`rounded-xl text-xs ${
                    selectedSlot?.start === slot.start
                      ? 'shadow-glow'
                      : 'hover:border-primary/40 hover:text-primary'
                  }`}
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
