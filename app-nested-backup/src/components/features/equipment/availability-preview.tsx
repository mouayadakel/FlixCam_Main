/**
 * AvailabilityPreview – mini calendar dropdown showing 14-day availability.
 * Fetches per-day availability from the API and renders colored day cells.
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { CalendarDays } from 'lucide-react'

interface AvailabilityPreviewProps {
  equipmentId: string
}

interface DayStatus {
  date: string
  available: boolean
}

export function AvailabilityPreview({ equipmentId }: AvailabilityPreviewProps) {
  const { t } = useLocale()
  const [days, setDays] = useState<DayStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchAvailability = useCallback(async () => {
    if (!equipmentId) return
    setLoading(true)
    try {
      const today = new Date()
      const checks = Array.from({ length: 14 }).map((_, i) => {
        const d = new Date(today)
        d.setDate(d.getDate() + i)
        const dateStr = d.toISOString().slice(0, 10)
        const next = new Date(d)
        next.setDate(next.getDate() + 1)
        const nextStr = next.toISOString().slice(0, 10)
        return fetch(
          `/api/public/equipment/${equipmentId}/availability?startDate=${dateStr}&endDate=${nextStr}`
        )
          .then((r) => r.json())
          .then((data) => ({ date: dateStr, available: !!data?.available }))
          .catch(() => ({ date: dateStr, available: false }))
      })
      setDays(await Promise.all(checks))
    } catch {
      setDays([])
    } finally {
      setLoading(false)
    }
  }, [equipmentId])

  useEffect(() => {
    if (open && days.length === 0) fetchAvailability()
  }, [open, days.length, fetchAvailability])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg border border-border-light/60 bg-white px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:border-brand-primary/30 hover:text-brand-primary"
      >
        <CalendarDays className="h-3.5 w-3.5" />
        {t('common.checkDates')}
      </button>

      {open && (
        <div className="absolute start-0 top-full z-30 mt-2 w-72 rounded-xl border border-border-light/60 bg-white p-4 shadow-lg">
          <p className="mb-3 text-sm font-semibold text-text-heading">
            {t('common.availabilityNext14')}
          </p>
          {loading ? (
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded-md bg-border-light/50" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((day) => (
                <div
                  key={day.date}
                  title={`${formatDay(day.date)} — ${day.available ? t('common.available') : t('common.unavailable')}`}
                  className={`flex h-8 items-center justify-center rounded-md text-[10px] font-medium transition-colors ${
                    day.available
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-red-50 text-red-500 ring-1 ring-red-200'
                  }`}
                >
                  {new Date(day.date).getDate()}
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-3 text-[10px] text-text-muted">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-100 ring-1 ring-emerald-200" />
              {t('common.available')}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-100 ring-1 ring-red-200" />
              {t('common.unavailable')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
