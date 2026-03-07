/**
 * @file page.tsx
 * @description Calendar – real booking data, month/list view
 * @module app/admin/(routes)/calendar
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw } from 'lucide-react'
import { formatDate } from '@/lib/utils/format.utils'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  bookingId: string
  bookingNumber: string
  status: string
  resourceType: string
  resourceId: string
  resourceName: string
  customerName: string
  bufferMinutesBefore: number
  bufferMinutesAfter: number
}

function getMonthRange(date: Date): { from: Date; to: Date } {
  const from = new Date(date.getFullYear(), date.getMonth(), 1)
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
  return { from, to }
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'CONFIRMED' || status === 'ACTIVE') return 'default'
  if (status === 'CANCELLED') return 'destructive'
  return 'secondary'
}

type ResourceFilter = 'all' | 'studio' | 'equipment'

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
    const { from, to } = getMonthRange(viewDate)
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

  const monthTitle = viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={thisMonth}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="min-w-[180px] text-center font-medium" aria-live="polite">
            {monthTitle}
          </span>
          <Button variant="ghost" size="icon" onClick={() => loadEvents()} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Multi-resource filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resource filter</CardTitle>
          <CardDescription>
            View by resource type or a single resource (buffer time shown for studios)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <select
              value={resourceType}
              onChange={(e) => {
                setResourceType(e.target.value as ResourceFilter)
                setResourceId('')
              }}
              className="flex h-9 w-[140px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="all">All</option>
              <option value="studio">Studios</option>
              <option value="equipment">Equipment</option>
            </select>
          </div>
          {resourceType === 'studio' && studios.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Studio</label>
              <select
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                className="flex h-9 min-w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">All studios</option>
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
              <label className="text-sm font-medium">Equipment</label>
              <select
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                className="flex h-9 min-w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">All equipment</option>
                {equipmentList.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.sku} {e.model ?? ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Bookings – {monthTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full rounded-md" />
          ) : events.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 text-muted-foreground">
              <p>No bookings in this period.</p>
              <p className="text-sm">Try another month or create a booking.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Buffer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="font-medium">{ev.bookingNumber}</TableCell>
                    <TableCell>{ev.customerName}</TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{ev.resourceType}</span>{' '}
                      {ev.resourceName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(ev.bufferMinutesBefore ?? 0) > 0 || (ev.bufferMinutesAfter ?? 0) > 0
                        ? `${ev.bufferMinutesBefore}m setup, ${ev.bufferMinutesAfter}m clean`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(ev.status)}>{ev.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(ev.start)}</TableCell>
                    <TableCell>{formatDate(ev.end)}</TableCell>
                    <TableCell className="text-end">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/bookings/${ev.bookingId}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
