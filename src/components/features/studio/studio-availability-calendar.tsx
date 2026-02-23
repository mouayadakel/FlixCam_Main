/**
 * Studio availability calendar: month-view widget showing day-level availability.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from 'lucide-react'

interface DayStatus {
  date: string
  status: 'available' | 'partial' | 'full' | 'closed' | 'blackout' | 'past'
}

interface ScheduleEntry {
  dayOfWeek: number
  openTime: string
  closeTime: string
  isClosed: boolean
}

interface StudioAvailabilityCalendarProps {
  studioSlug: string
  onSelectDate?: (date: string) => void
  selectedDate?: string
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200',
  partial: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200',
  full: 'bg-red-100 text-red-400 cursor-not-allowed border-red-200',
  closed: 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200',
  blackout: 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200',
  past: 'bg-gray-50 text-gray-300 cursor-not-allowed border-transparent',
}

const DAY_HEADERS_AR = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
const DAY_HEADERS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MONTH_NAMES_AR = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]
const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function StudioAvailabilityCalendar({
  studioSlug,
  onSelectDate,
  selectedDate,
}: StudioAvailabilityCalendarProps) {
  const { t, locale } = useLocale()
  const isAr = locale === 'ar'

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [days, setDays] = useState<DayStatus[]>([])
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [loading, setLoading] = useState(false)

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`

  const fetchCalendar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/public/studios/${studioSlug}/calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: monthStr }),
      })
      if (res.ok) {
        const json = await res.json()
        setDays(Array.isArray(json.data) ? json.data : [])
        if (Array.isArray(json.schedule)) setSchedule(json.schedule)
      }
    } catch {
      setDays([])
    } finally {
      setLoading(false)
    }
  }, [studioSlug, monthStr])

  useEffect(() => {
    fetchCalendar()
  }, [fetchCalendar])

  const goPrev = () => {
    const d = new Date(year, month - 1, 1)
    if (d >= new Date(now.getFullYear(), now.getMonth(), 1)) {
      setYear(d.getFullYear())
      setMonth(d.getMonth())
    }
  }
  const goNext = () => {
    const d = new Date(year, month + 1, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const canGoPrev =
    year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth())

  // Build grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dayMap = new Map(days.map((d) => [d.date, d]))

  const dayHeaders = isAr ? DAY_HEADERS_AR : DAY_HEADERS_EN
  const monthName = isAr ? MONTH_NAMES_AR[month] : MONTH_NAMES_EN[month]

  // Schedule legend
  const todaySched = schedule.find((s) => s.dayOfWeek === now.getDay())

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-text-heading">
          <CalendarDays className="h-5 w-5 text-primary" />
          {t('studios.availabilityCalendar')}
        </h3>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between rounded-xl bg-surface-light px-4 py-2.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={goPrev}
          disabled={!canGoPrev}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">
          {monthName} {year}
        </span>
        <Button variant="ghost" size="icon" onClick={goNext} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {dayHeaders.map((h) => (
              <div key={h} className="py-1.5 text-[11px] font-medium text-muted-foreground">
                {h}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const d = i + 1
              const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`
              const day = dayMap.get(dateStr)
              const status = day?.status ?? 'past'
              const isSelectable = status === 'available' || status === 'partial'
              const isSelected = selectedDate === dateStr

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={!isSelectable}
                  onClick={() => isSelectable && onSelectDate?.(dateStr)}
                  className={`relative flex h-10 items-center justify-center rounded-lg border text-sm font-medium transition-all ${STATUS_COLORS[status] ?? STATUS_COLORS.past} ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''} `}
                >
                  {d}
                  {status === 'partial' && (
                    <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-500" />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-200" />
          {t('studios.calAvailable')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-200" />
          {t('studios.calPartial')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-200" />
          {t('studios.calFull')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gray-200" />
          {t('studios.calClosed')}
        </span>
      </div>

      {/* Today's hours */}
      {todaySched && !todaySched.isClosed && (
        <p className="text-xs text-muted-foreground">
          {t('studios.todayHours')}:{' '}
          <span className="font-medium">
            {todaySched.openTime} – {todaySched.closeTime}
          </span>
        </p>
      )}
    </div>
  )
}
