'use client'

/**
 * FullCalendar resource timeline for admin bookings (FIX-037).
 */

import { useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import { cn } from '@/lib/utils'

export type AdminCalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  resourceId: string
  status: string
  bookingId: string
}

export type AdminCalendarResource = {
  id: string
  title: string
}

type Props = {
  events: AdminCalendarEvent[]
  resources: AdminCalendarResource[]
  initialDate: Date
  onEventClick?: (eventId: string) => void
  className?: string
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10b981',
  CONFIRMED: '#3b82f6',
  OVERDUE: '#f43f5e',
  DRAFT: '#f59e0b',
}

export function AdminFullCalendar({
  events,
  resources,
  initialDate,
  onEventClick,
  className,
}: Props) {
  const fcEvents = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        resourceId: e.resourceId,
        backgroundColor: STATUS_COLORS[e.status] ?? '#6366f1',
        borderColor: STATUS_COLORS[e.status] ?? '#6366f1',
        extendedProps: { bookingId: e.bookingId, status: e.status },
      })),
    [events]
  )

  const fcResources = useMemo(
    () => resources.map((r) => ({ id: r.id, title: r.title })),
    [resources]
  )

  return (
    <div className={cn('admin-fullcalendar min-h-[480px]', className)}>
      <FullCalendar
        plugins={[resourceTimelinePlugin]}
        initialView="resourceTimelineMonth"
        initialDate={initialDate}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'resourceTimelineMonth,resourceTimelineWeek',
        }}
        resources={fcResources}
        events={fcEvents}
        resourceAreaHeaderContent="Resource"
        height="auto"
        eventClick={(info) => onEventClick?.(info.event.id)}
        slotMinWidth={28}
        resourceAreaWidth="18%"
      />
      <style jsx global>{`
        .admin-fullcalendar .fc {
          --fc-border-color: hsl(var(--border));
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: hsl(var(--muted));
          font-size: 0.8125rem;
        }
        .admin-fullcalendar .fc .fc-toolbar-title {
          font-size: 1.125rem;
          font-weight: 700;
        }
      `}</style>
    </div>
  )
}
