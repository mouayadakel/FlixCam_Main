/**
 * Recurring Booking Form for Studios – allows weekly/biweekly/monthly recurrence.
 * Generates a list of dates based on the pattern for the user to confirm.
 */

'use client'

import { useState, useMemo } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CalendarDays, Repeat, Check } from 'lucide-react'

type Frequency = 'weekly' | 'biweekly' | 'monthly'

interface RecurringBookingFormProps {
  studioId: string
  studioName: string
  hourlyRate: number
  onSubmit?: (dates: string[], frequency: Frequency, hoursPerSession: number) => void
}

export function RecurringBookingForm({
  studioId,
  studioName,
  hourlyRate,
  onSubmit,
}: RecurringBookingFormProps) {
  const { t } = useLocale()
  const [startDate, setStartDate] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('weekly')
  const [sessions, setSessions] = useState(4)
  const [hoursPerSession, setHoursPerSession] = useState(2)

  const today = new Date().toISOString().split('T')[0]

  const generatedDates = useMemo(() => {
    if (!startDate) return []
    const dates: string[] = []
    const start = new Date(startDate)
    for (let i = 0; i < sessions; i++) {
      const d = new Date(start)
      if (frequency === 'weekly') d.setDate(d.getDate() + i * 7)
      else if (frequency === 'biweekly') d.setDate(d.getDate() + i * 14)
      else d.setMonth(d.getMonth() + i)
      dates.push(d.toISOString().slice(0, 10))
    }
    return dates
  }, [startDate, frequency, sessions])

  const totalHours = sessions * hoursPerSession
  const totalCost = totalHours * hourlyRate

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (generatedDates.length > 0) {
      onSubmit?.(generatedDates, frequency, hoursPerSession)
    }
  }

  const frequencyOptions: { value: Frequency; label: string }[] = [
    { value: 'weekly', label: t('studios.freqWeekly') },
    { value: 'biweekly', label: t('studios.freqBiweekly') },
    { value: 'monthly', label: t('studios.freqMonthly') },
  ]

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-border-light/60 bg-white p-6 shadow-card"
    >
      <div className="flex items-center gap-2">
        <Repeat className="h-5 w-5 text-brand-primary" />
        <h3 className="text-lg font-semibold text-text-heading">{t('studios.recurringBooking')}</h3>
      </div>

      <p className="text-sm text-text-muted">{studioName}</p>

      {/* Start date */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-text-muted">
          <CalendarDays className="me-1 inline h-3.5 w-3.5" />
          {t('studios.firstSession')}
        </Label>
        <Input
          type="date"
          value={startDate}
          min={today}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-xl"
          required
        />
      </div>

      {/* Frequency */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-text-muted">{t('studios.frequency')}</Label>
        <div className="flex gap-2">
          {frequencyOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFrequency(opt.value)}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                frequency === opt.value
                  ? 'border-brand-primary bg-brand-primary/5 text-brand-primary'
                  : 'border-border-light text-text-muted hover:border-brand-primary/30'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions count */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-text-muted">{t('studios.sessionCount')}</Label>
          <Input
            type="number"
            value={sessions}
            min={2}
            max={52}
            onChange={(e) => setSessions(Math.max(2, parseInt(e.target.value) || 2))}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-text-muted">
            {t('studios.hoursPerSession')}
          </Label>
          <Input
            type="number"
            value={hoursPerSession}
            min={1}
            max={24}
            onChange={(e) => setHoursPerSession(Math.max(1, parseInt(e.target.value) || 1))}
            className="rounded-xl"
          />
        </div>
      </div>

      {/* Generated dates preview */}
      {generatedDates.length > 0 && (
        <div className="rounded-xl bg-surface-light/50 p-4">
          <p className="mb-2 text-xs font-medium text-text-muted">{t('studios.scheduledDates')}</p>
          <div className="flex flex-wrap gap-2">
            {generatedDates.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-text-heading ring-1 ring-border-light/60"
              >
                <Check className="h-3 w-3 text-emerald-500" />
                {new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-baseline gap-2 border-t border-border-light/50 pt-3">
            <span className="text-sm text-text-muted">
              {totalHours} {t('studios.totalHours')}
            </span>
            <span className="text-lg font-bold text-brand-primary">
              {totalCost.toLocaleString()} SAR
            </span>
          </div>
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={generatedDates.length === 0}
        className="w-full rounded-xl bg-brand-primary font-semibold shadow-md transition-all hover:bg-brand-primary-hover hover:shadow-lg"
      >
        {t('studios.confirmRecurring')}
      </Button>
    </form>
  )
}
