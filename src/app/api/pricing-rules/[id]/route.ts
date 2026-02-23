/**
 * @file route.ts
 * @description Single pricing rule – get, update, delete
 * @module app/api/pricing-rules/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { updatePricingRuleSchema } from '@/lib/validators/pricing-rule.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'
import { Decimal } from '@prisma/client/runtime/library'

function shapeRule(r: {
  id: string
  name: string
  description: string | null
  ruleType: string
  priority: number
  conditions: unknown
  adjustmentType: string
  adjustmentValue: Decimal
  isActive: boolean
  validFrom: Date | null
  validUntil: Date | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
  creator?: { id: string; name: string | null; email: string }
}) {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    ruleType: r.ruleType,
    priority: r.priority,
    conditions: r.conditions,
    adjustmentType: r.adjustmentType,
    adjustmentValue: r.adjustmentValue.toString(),
    isActive: r.isActive,
    validFrom: r.validFrom?.toISOString() ?? null,
    validUntil: r.validUntil?.toISOString() ?? null,
    createdBy: r.createdBy,
    creator: r.creator,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()
    const { id } = await params
    const rule = await prisma.pricingRule.findUnique({
      where: { id },
      include: { creator: { select: { id: true, name: true, email: true } } },
    })
    if (!rule) throw new NotFoundError('Pricing rule', id)
    return NextResponse.json(shapeRule(rule))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()
    const { id } = await params
    const existing = await prisma.pricingRule.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('Pricing rule', id)

    const body = await request.json()
    const parsed = updatePricingRuleSchema.parse(body)

    const newRange =
      parsed.conditions != null
        ? ((parsed.conditions as { dateRange?: { start?: string; end?: string } }).dateRange ?? {})
        : ((existing.conditions as { dateRange?: { start?: string; end?: string } })?.dateRange ??
          {})
    const rangeToCheck = newRange.start && newRange.end ? newRange : null
    if (rangeToCheck) {
      const ruleType = (parsed.ruleType ?? existing.ruleType) as (typeof existing)['ruleType']
      const others = await prisma.pricingRule.findMany({
        where: { isActive: true, ruleType, id: { not: id } },
        select: { id: true, name: true, conditions: true },
      })
      const conflicts = others.filter((r) => {
        const cond = (r.conditions ?? {}) as { dateRange?: { start?: string; end?: string } }
        const b = cond.dateRange ?? {}
        if (!b.start || !b.end) return true
        const aStart = new Date(rangeToCheck.start!).getTime()
        const aEnd = new Date(rangeToCheck.end!).getTime()
        const bStart = new Date(b.start).getTime()
        const bEnd = new Date(b.end).getTime()
        return aStart <= bEnd && bStart <= aEnd
      })
      if (conflicts.length > 0) {
        return NextResponse.json(
          {
            error: 'تعارض مع قواعد تسعير نشطة في نفس الفترة',
            code: 'CONFLICT',
            conflictingRules: conflicts.map((c) => ({ id: c.id, name: c.name })),
          },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.name !== undefined) updateData.name = parsed.name
    if (parsed.description !== undefined) updateData.description = parsed.description
    if (parsed.ruleType !== undefined) updateData.ruleType = parsed.ruleType
    if (parsed.priority !== undefined) updateData.priority = parsed.priority
    if (parsed.conditions !== undefined) updateData.conditions = parsed.conditions
    if (parsed.adjustmentType !== undefined) updateData.adjustmentType = parsed.adjustmentType
    if (parsed.adjustmentValue !== undefined)
      updateData.adjustmentValue = new Decimal(parsed.adjustmentValue)
    if (parsed.isActive !== undefined) updateData.isActive = parsed.isActive
    if (parsed.validFrom !== undefined)
      updateData.validFrom = parsed.validFrom ? new Date(parsed.validFrom) : null
    if (parsed.validUntil !== undefined)
      updateData.validUntil = parsed.validUntil ? new Date(parsed.validUntil) : null

    const rule = await prisma.pricingRule.update({
      where: { id },
      data: updateData,
      include: { creator: { select: { id: true, name: true, email: true } } },
    })
    return NextResponse.json(shapeRule(rule))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()
    const { id } = await params
    const existing = await prisma.pricingRule.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('Pricing rule', id)
    await prisma.pricingRule.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
