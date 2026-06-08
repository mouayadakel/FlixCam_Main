/**
 * @file page.tsx
 * @description Premium visual scheduler calendar – resource timeline lanes & conflicts management
 * @module app/admin/(routes)/calendar
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  RefreshCw, 
  Layers, 
  Film, 
  Video, 
  AlertTriangle,
  Info,
  ExternalLink
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils/format.utils'
import { AdminFullCalendar } from '@/components/admin/admin-full-calendar'
import { useLocale } from '@/hooks/use-locale'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  bookingId: string
  bookingNumber: string
  status: string
  resourceType: 'studio' | 'equipment'
  resourceId: string
  resourceName: string
  customerName: string
  bufferMinutesBefore: number
  bufferMinutesAfter: number
}

type ResourceFilter = 'all' | 'studio' | 'equipment'

// Get array of all dates in the current month
function getDaysInMonth(year: number, month: number): Date[] {
  const date = new Date(year, month, 1)
  const days: Date[] = []
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

export default function CalendarPage() {
  const [viewDate, setViewDate] = useState(() => new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [resourceType, setResourceType] = useState<ResourceFilter>('all')
  const [resourceId, setResourceId] = useState<string>('')
  const [studios, setStudios] = useState<Array<{ id: string; name: string }>>([])
  const [equipmentList, setEquipmentList] = useState<
    Array<{ id: string; sku: string; model: string | null }>
  >([])
  
  // Selected event detail popover state
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [viewMode, setViewMode] = useState<'timeline' | 'fullcalendar'>('timeline')
  const { dir } = useLocale()

  const loadResources = useCallback(async () => {
    try {
      const [studiosRes, eqRes] = await Promise.all([
        fetch('/api/studios'),
        fetch('/api/equipment?take=200'),
      ])
      if (studiosRes.ok) {
        const d = await studiosRes.json()
        setStudios(d.data ?? d.studios ?? [])
      }
      if (eqRes.ok) {
        const d = await eqRes.json()
        setEquipmentList(d.items ?? d.equipment ?? d.data ?? [])
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    loadResources()
  }, [loadResources])

  const loadEvents = useCallback(async () => {
    setLoading(true)
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const from = new Date(year, month, 1)
    const to = new Date(year, month + 1, 0, 23, 59, 59)
    
    try {
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      })
      if (resourceType === 'studio' || resourceType === 'equipment') {
        params.set('resourceType', resourceType)
      }
      if (resourceId) {
        params.set('resourceId', resourceId)
      }
      const res = await fetch(`/api/calendar?${params}`)
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setEvents(Array.isArray(json.data) ? json.data : [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [viewDate, resourceType, resourceId])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1))
  const nextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1))
  const thisMonth = () => setViewDate(new Date())

  const monthTitle = formatDate(viewDate, 'long', 'ar')
  const days = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth())

  // Status visual variants
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/20 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
      case 'CONFIRMED':
        return 'bg-blue-500/20 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'
      case 'OVERDUE':
        return 'bg-rose-500/20 text-rose-700 border-rose-300 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'
      case 'DRAFT':
      default:
        return 'bg-amber-500/20 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
    }
  }

  // Get resources that have active bookings
  const activeResources = Array.from(new Set(events.map(e => `${e.resourceType}:${e.resourceId}`)))
    .map(key => {
      const [type, id] = key.split(':')
      const name = events.find(e => e.resourceType === type && e.resourceId === id)?.resourceName || id
      return { id, name, type: type as 'studio' | 'equipment' }
    })

  return (
    <div className="space-y-6 select-none" dir={dir}>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-slate-900/5 dark:bg-slate-900/40 p-4 rounded-xl border">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary" />
            جدول المخطط الزمني (Resource Timeline)
          </h1>
          <p className="text-sm text-slate-500 mt-1">تتبع وحجز المعدات والاستوديوهات على مخطط زمني تفاعلي مانع للتعارضات.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('timeline')}
          >
            عرض مخصص
          </Button>
          <Button
            variant={viewMode === 'fullcalendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('fullcalendar')}
          >
            FullCalendar
          </Button>
          <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Previous month">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={thisMonth} className="font-semibold">
            اليوم
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Next month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[150px] text-center font-black text-lg text-primary" aria-live="polite">
            {monthTitle}
          </span>
          <Button variant="ghost" size="icon" onClick={() => loadEvents()} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Multi-resource filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 font-bold">
                <Layers className="h-5 w-5 text-primary" />
                فلاتر المخطط
              </CardTitle>
              <CardDescription>فرز الحجوزات حسب النوع أو المصادر الفردية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">نوع المورد</label>
                <select
                  value={resourceType}
                  onChange={(e) => {
                    setResourceType(e.target.value as ResourceFilter)
                    setResourceId('')
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-semibold"
                >
                  <option value="all">الكل (All Resources)</option>
                  <option value="studio">الاستوديوهات (Studios)</option>
                  <option value="equipment">المعدات (Equipment)</option>
                </select>
              </div>

              {resourceType === 'studio' && studios.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">الاستوديو</label>
                  <select
                    value={resourceId}
                    onChange={(e) => setResourceId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-semibold"
                  >
                    <option value="">كل الاستوديوهات</option>
                    {studios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {resourceType === 'equipment' && equipmentList.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">المعدة</label>
                  <select
                    value={resourceId}
                    onChange={(e) => setResourceId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-semibold"
                  >
                    <option value="">كل المعدات</option>
                    {equipmentList.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.sku} {e.model ?? ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Guide */}
              <div className="pt-4 border-t space-y-2">
                <span className="text-xs font-bold text-slate-400">دليل الحالات</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="h-3 w-3 rounded-full bg-blue-500" />
                    <span>مؤكد (Confirmed)</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span>نشط (Active)</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="h-3 w-3 rounded-full bg-rose-500" />
                    <span>متأخر (Overdue)</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="h-3 w-3 rounded-full bg-amber-500" />
                    <span>مسودة (Draft)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-slate-50/50 dark:bg-slate-900/10">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">إجمالي الحجوزات النشطة:</span>
                <Badge className="font-bold">{events.length}</Badge>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">الموارد المشغولة هذا الشهر:</span>
                <span className="font-bold text-primary">{activeResources.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline Grid */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {viewMode === 'fullcalendar' ? (
                <div className="p-4">
                  <AdminFullCalendar
                    initialDate={viewDate}
                    resources={activeResources.map((r) => ({
                      id: `${r.type}:${r.id}`,
                      title: r.name,
                    }))}
                    events={events.map((ev) => ({
                      id: ev.id,
                      title: `#${ev.bookingNumber} – ${ev.customerName}`,
                      start: ev.start,
                      end: ev.end,
                      resourceId: `${ev.resourceType}:${ev.resourceId}`,
                      status: ev.status,
                      bookingId: ev.bookingId,
                    }))}
                    onEventClick={(id) => {
                      const ev = events.find((e) => e.id === id)
                      if (ev) setSelectedEvent(ev)
                    }}
                  />
                </div>
              ) : loading ? (
                <div className="p-8">
                  <Skeleton className="h-96 w-full rounded-lg" />
                </div>
              ) : events.length === 0 ? (
                <div className="flex h-96 flex-col items-center justify-center p-8 text-center text-muted-foreground border-dashed">
                  <CalendarIcon className="h-16 w-16 opacity-10 mb-4" />
                  <p className="text-lg font-bold">لا توجد حجوزات مجدولة في هذه الفترة</p>
                  <p className="text-sm">اختر شهراً آخر أو قم بإنشاء حجز جديد للبدء.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px] border-b">
                    {/* Header: Days of Month */}
                    <div className="flex bg-slate-50 dark:bg-slate-900/50 border-b">
                      <div className="w-[180px] shrink-0 border-l p-3 font-black text-xs text-slate-500 sticky right-0 bg-slate-50 dark:bg-slate-900 z-10">
                        المصدر (Resource)
                      </div>
                      <div className="flex flex-1">
                        {days.map((day) => {
                          const isToday = new Date().toDateString() === day.toDateString()
                          return (
                            <div
                              key={day.toISOString()}
                              className={`flex-1 text-center border-l py-2 min-w-[32px] ${
                                isToday ? 'bg-primary/10 font-black text-primary' : ''
                              }`}
                            >
                              <div className="text-[10px] uppercase font-bold text-slate-400">
                                {day.toLocaleDateString('ar-SA', { weekday: 'narrow' })}
                              </div>
                              <div className="text-xs font-bold">{day.getDate()}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Lanes for each resource */}
                    <div className="divide-y relative">
                      {activeResources.map((res) => (
                        <div key={`${res.type}-${res.id}`} className="flex items-center min-h-[50px] relative hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                          {/* Resource Label */}
                          <div className="w-[180px] shrink-0 border-l p-3 font-semibold text-xs sticky right-0 bg-white dark:bg-slate-950 z-10 flex items-center gap-2 border-r">
                            {res.type === 'studio' ? (
                              <Video className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : (
                              <Film className="h-4 w-4 text-blue-500 shrink-0" />
                            )}
                            <span className="truncate">{res.name}</span>
                          </div>

                          {/* Days lane grid with event blocks */}
                          <div className="flex flex-1 relative min-h-[50px]">
                            {days.map((day) => (
                              <div
                                key={day.toISOString()}
                                className="flex-1 border-l min-w-[32px]"
                              />
                            ))}

                            {/* Absolutely positioned events overlaying on this specific lane */}
                            {events
                              .filter((e) => e.resourceId === res.id && e.resourceType === res.type)
                              .map((ev) => {
                                const evStart = new Date(ev.start)
                                const evEnd = new Date(ev.end)

                                // Find day index coordinates
                                const startDayIdx = days.findIndex(
                                  (d) => d.toDateString() === evStart.toDateString()
                                )
                                const endDayIdx = days.findIndex(
                                  (d) => d.toDateString() === evEnd.toDateString()
                                )

                                if (startDayIdx === -1 && endDayIdx === -1) return null

                                const safeStartIdx = startDayIdx === -1 ? 0 : startDayIdx
                                const safeEndIdx = endDayIdx === -1 ? days.length - 1 : endDayIdx
                                const spanDays = Math.max(1, safeEndIdx - safeStartIdx + 1)

                                const leftPercent = (safeStartIdx / days.length) * 100
                                const widthPercent = (spanDays / days.length) * 100

                                return (
                                  <button
                                    key={ev.id}
                                    style={{
                                      right: `${leftPercent}%`,
                                      width: `${widthPercent}%`,
                                    }}
                                    onClick={() => setSelectedEvent(ev)}
                                    className={`absolute top-2 h-7 rounded-md border text-[10px] font-bold px-2 py-0.5 shadow-sm truncate text-start z-10 transition-transform hover:scale-[1.02] active:scale-95 ${getStatusColor(
                                      ev.status
                                    )}`}
                                  >
                                    #{ev.bookingNumber} – {ev.customerName}
                                  </button>
                                )
                              })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selected Event Details Modal Popover */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b p-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-black text-primary">تفاصيل الحجز</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedEvent(null)}
                  className="h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>
              <CardDescription className="text-xs">تخصيصات الموارد والمواعيد المؤكدة</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400 font-bold block">رقم الحجز</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">#{selectedEvent.bookingNumber}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold block">العميل</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedEvent.customerName}</span>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold">نوع المورد</span>
                  <Badge variant="outline" className="font-bold">
                    {selectedEvent.resourceType === 'studio' ? 'استوديو' : 'معدة/منتج'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold">اسم المصدر</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{selectedEvent.resourceName}</span>
                </div>
              </div>

              <div className="border-t pt-3 space-y-1">
                <div>
                  <span className="text-xs text-slate-400 font-bold block">تاريخ البدء</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{formatDate(selectedEvent.start)}</span>
                </div>
                <div className="mt-2">
                  <span className="text-xs text-slate-400 font-bold block">تاريخ الانتهاء</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{formatDate(selectedEvent.end)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  asChild 
                  className="flex-1 font-bold gap-1.5"
                  onClick={() => setSelectedEvent(null)}
                >
                  <Link href={`/admin/bookings/${selectedEvent.bookingId}`}>
                    عرض كامل الحجز
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedEvent(null)}
                  className="font-bold"
                >
                  إغلاق
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
