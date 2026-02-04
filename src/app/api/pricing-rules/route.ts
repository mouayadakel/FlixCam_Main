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

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const body = await request.json()
    const parsed = createPricingRuleSchema.parse(body)

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
