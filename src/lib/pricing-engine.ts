/**
 * @file pricing-engine.ts
 * @description Dynamic pricing: base prices + pricing rules
 * @module lib/pricing-engine
 */

import { prisma } from '@/lib/db/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export interface PricingParams {
  equipmentIds?: string[]
  studioId?: string | null
  startDate: Date
  endDate: Date
  customerId?: string | null
}

export interface PricingResult {
  basePrice: number
  finalPrice: number
  breakdown: Array<{ label: string; amount: number }>
  appliedRules: Array<{ ruleName: string; adjustmentType: string; adjustmentValue: number; newTotal: number }>
}

function diffDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

function diffHours(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  return Math.max(0, ms / (60 * 60 * 1000))
}

export async function calculatePrice(params: PricingParams): Promise<PricingResult> {
  const { equipmentIds = [], studioId, startDate, endDate, customerId } = params
  const start = startDate instanceof Date ? startDate : new Date(startDate)
  const end = endDate instanceof Date ? endDate : new Date(endDate)
  const days = diffDays(start, end) || 1
  const breakdown: Array<{ label: string; amount: number }> = []
  let baseTotal = 0

  if (equipmentIds.length > 0) {
    const equipment = await prisma.equipment.findMany({
      where: { id: { in: equipmentIds }, deletedAt: null },
      select: { id: true, sku: true, model: true, dailyPrice: true, weeklyPrice: true, monthlyPrice: true },
    })
    for (const eq of equipment) {
      const daily = Number(eq.dailyPrice)
      const amount = days * daily
      baseTotal += amount
      breakdown.push({ label: `${eq.sku} ${eq.model ?? ''} (${days} days)`, amount })
    }
  }

  if (studioId) {
    const studio = await prisma.studio.findFirst({
      where: { id: studioId, deletedAt: null },
      select: { id: true, name: true, hourlyRate: true },
    })
    if (studio) {
      const studioStart = start
      const studioEnd = end
      const hours = diffHours(studioStart, studioEnd) || 1
      const amount = hours * Number(studio.hourlyRate)
      baseTotal += amount
      breakdown.push({ label: `${studio.name} (${hours.toFixed(1)} hrs)`, amount })
    }
  }

  let currentTotal = baseTotal
  const appliedRules: PricingResult['appliedRules'] = []

  const rules = await prisma.pricingRule.findMany({
    where: {
      isActive: true,
      OR: [
        { validFrom: null, validUntil: null },
        {
          validFrom: { lte: start },
          validUntil: { gte: end },
        },
      ],
    },
    orderBy: { priority: 'desc' },
  })

  const userSegmentId = customerId
    ? (await prisma.user.findUnique({ where: { id: customerId }, select: { segmentId: true } }))?.segmentId ?? null
    : null

  for (const rule of rules) {
    const conditions = (rule.conditions as Record<string, unknown>) ?? {}
    if (!ruleApplies(conditions, { start, end, days, customerId, userSegmentId, equipmentIds, studioId })) continue

    const adjType = rule.adjustmentType
    const adjVal = Number(rule.adjustmentValue)
    let newTotal = currentTotal

    if (adjType === 'PERCENTAGE') {
      newTotal = currentTotal * (1 + adjVal / 100)
    } else if (adjType === 'FIXED') {
      newTotal = currentTotal + adjVal
    } else if (adjType === 'REPLACE') {
      newTotal = adjVal
    }
    newTotal = Math.max(0, Math.round(newTotal * 100) / 100)
    appliedRules.push({
      ruleName: rule.name,
      adjustmentType: adjType,
      adjustmentValue: adjVal,
      newTotal,
    })
    currentTotal = newTotal
  }

  return {
    basePrice: baseTotal,
    finalPrice: currentTotal,
    breakdown,
    appliedRules,
  }
}

function ruleApplies(
  conditions: Record<string, unknown>,
  ctx: {
    start: Date
    end: Date
    days: number
    customerId: string | null | undefined
    userSegmentId: string | null
    equipmentIds: string[]
    studioId?: string | null
  }
): boolean {
  if (conditions.dateRange && typeof conditions.dateRange === 'object') {
    const range = conditions.dateRange as { start?: string; end?: string }
    const rangeStart = range.start ? new Date(range.start).getTime() : 0
    const rangeEnd = range.end ? new Date(range.end).getTime() : Infinity
    if (ctx.start.getTime() < rangeStart || ctx.end.getTime() > rangeEnd) return false
  }
  if (Array.isArray(conditions.daysOfWeek) && conditions.daysOfWeek.length > 0) {
    const day = ctx.start.getDay()
    if (!(conditions.daysOfWeek as number[]).includes(day)) return false
  }
  if (typeof conditions.minDuration === 'number' && ctx.days < conditions.minDuration) return false
  if (typeof conditions.maxDuration === 'number' && ctx.days > conditions.maxDuration) return false
  if (Array.isArray(conditions.customerSegmentIds) && conditions.customerSegmentIds.length > 0) {
    if (!ctx.userSegmentId || !(conditions.customerSegmentIds as string[]).includes(ctx.userSegmentId)) return false
  }
  if (conditions.studioIds && Array.isArray(conditions.studioIds) && ctx.studioId) {
    if (!(conditions.studioIds as string[]).includes(ctx.studioId)) return false
  }
  return true
}
