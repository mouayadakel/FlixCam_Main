/**
 * @file studio-schedule.service.ts
 * @description Service for managing studio weekly operating hours
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'

export interface ScheduleEntry {
  dayOfWeek: number
  openTime: string
  closeTime: string
  isClosed: boolean
}

const DEFAULT_OPEN = '09:00'
const DEFAULT_CLOSE = '22:00'

export class StudioScheduleService {
  /**
   * Get schedule for a studio (all 7 days). Returns defaults for missing days.
   */
  static async getSchedule(studioId: string): Promise<ScheduleEntry[]> {
    const rows = await prisma.studioSchedule.findMany({
      where: { studioId },
      orderBy: { dayOfWeek: 'asc' },
    })

    const map = new Map(rows.map((r) => [r.dayOfWeek, r]))

    return Array.from({ length: 7 }, (_, i) => {
      const row = map.get(i)
      return {
        dayOfWeek: i,
        openTime: row?.openTime ?? DEFAULT_OPEN,
        closeTime: row?.closeTime ?? DEFAULT_CLOSE,
        isClosed: row?.isClosed ?? false,
      }
    })
  }

  /**
   * Get schedule for a specific day of week
   */
  static async getForDay(studioId: string, dayOfWeek: number): Promise<ScheduleEntry> {
    const row = await prisma.studioSchedule.findUnique({
      where: { studioId_dayOfWeek: { studioId, dayOfWeek } },
    })
    return {
      dayOfWeek,
      openTime: row?.openTime ?? DEFAULT_OPEN,
      closeTime: row?.closeTime ?? DEFAULT_CLOSE,
      isClosed: row?.isClosed ?? false,
    }
  }

  /**
   * Upsert the full weekly schedule (all 7 days)
   */
  static async saveSchedule(studioId: string, entries: ScheduleEntry[]) {
    await prisma.$transaction(
      entries.map((entry) =>
        prisma.studioSchedule.upsert({
          where: { studioId_dayOfWeek: { studioId, dayOfWeek: entry.dayOfWeek } },
          create: {
            studioId,
            dayOfWeek: entry.dayOfWeek,
            openTime: entry.openTime,
            closeTime: entry.closeTime,
            isClosed: entry.isClosed,
          },
          update: {
            openTime: entry.openTime,
            closeTime: entry.closeTime,
            isClosed: entry.isClosed,
          },
        })
      )
    )
    return this.getSchedule(studioId)
  }
}
