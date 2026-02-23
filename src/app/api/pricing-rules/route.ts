/**
 * @file route.ts
 * @description Pricing rules API – list and create
 * @module app/api/pricing-rules
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { createPricingRuleSchema } from '@/lib/validators/pricing-rule.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const rules = await prisma.pricingRule.findMany({
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      include: { creator: { select: { id: true, name: true, email: true } } },
    })

    const shape = rules.map((r) => ({
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
      appliedCount:
        'appliedCount' in r ? Number((r as { appliedCount?: number }).appliedCount ?? 0) : 0,
      totalImpact:
        'totalImpact' in r && (r as { totalImpact?: unknown }).totalImpact != null
          ? (() => {
              const t = (r as { totalImpact: unknown }).totalImpact
              return typeof t === 'object' && t != null && 'toNumber' in t
                ? (t as { toNumber: () => number }).toNumber()
                : Number(t)
            })()
          : 0,
      createdBy: r.createdBy,
      creator: r.creator,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))

    return NextResponse.json({ rules: shape })
  } catch (error) {
    return handleApiError(error)
  }
}

function dateRangesOverlap(
  a: { start: string; end: string },
  b: { start?: string; end?: string }
): boolean {
  if (!b.start || !b.end) return true
  const aStart = new Date(a.start).getTime()
  const aEnd = new Date(a.end).getTime()
  const bStart = new Date(b.start).getTime()
  const bEnd = new Date(b.end).getTime()
  return aStart <= bEnd && bStart <= aEnd
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const body = await request.json()
    const parsed = createPricingRuleSchema.parse(body)

    const newRange = (parsed.conditions?.dateRange ?? {}) as { start?: string; end?: string }
    if (newRange.start && newRange.end) {
      const existing = await prisma.pricingRule.findMany({
        where: { isActive: true, ruleType: parsed.ruleType },
        select: { id: true, name: true, conditions: true },
      })
      const conflicts = existing.filter((r) => {
        const cond = (r.conditions ?? {}) as { dateRange?: { start?: string; end?: string } }
        return dateRangesOverlap(
          { start: newRange.start!, end: newRange.end! },
          cond.dateRange ?? {}
        )
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

    const rule = await prisma.pricingRule.create({
      data: {
        name: parsed.name,
        description: parsed.description ?? null,
        ruleType: parsed.ruleType,
        priority: parsed.priority ?? 0,
        conditions: parsed.conditions as object,
        adjustmentType: parsed.adjustmentType,
        adjustmentValue: new Decimal(parsed.adjustmentValue),
        isActive: parsed.isActive ?? true,
        validFrom: parsed.validFrom ? new Date(parsed.validFrom) : null,
        validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null,
        createdBy: session.user.id,
      },
      include: { creator: { select: { id: true, name: true } } },
    })

    return NextResponse.json({
      rule: {
        ...rule,
        adjustmentValue: rule.adjustmentValue.toString(),
        validFrom: rule.validFrom?.toISOString() ?? null,
        validUntil: rule.validUntil?.toISOString() ?? null,
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
