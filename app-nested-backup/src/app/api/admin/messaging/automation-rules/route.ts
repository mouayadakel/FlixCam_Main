/**
 * GET – list automation rules (with optional filters)
 * POST – create automation rule
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { handleApiError } from '@/lib/utils/api-helpers'
import { createAutomationRuleSchema } from '@/lib/validators/automation-rule.validator'
import type { Prisma } from '@prisma/client'

async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const canRead = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_READ)
  if (!canRead) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return session
}

function mapRuleToResponse(r: {
  id: string
  name: string
  description: string | null
  isActive: boolean
  priority: number
  trigger: string
  triggerDelay: number
  delayMinutes: number
  channels: unknown
  templateId: string | null
  conditions: unknown
  sendWindow: unknown
  timezone: string
  respectDND: boolean
  recipientType: string
  specificRecipients: unknown
  maxRetries: number
  retryDelay: number
  allowDuplicates: boolean
  frequencyCap: unknown
  sentCount: number
  failedCount: number
  lastTriggered: Date | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    isActive: r.isActive,
    priority: r.priority,
    trigger: r.trigger,
    triggerDelay: r.triggerDelay,
    delayMinutes: r.delayMinutes,
    channels: r.channels as string[],
    templateId: r.templateId,
    conditions: r.conditions,
    sendWindow: r.sendWindow,
    timezone: r.timezone,
    respectDND: r.respectDND,
    recipientType: r.recipientType,
    specificRecipients: r.specificRecipients as string[] | null,
    maxRetries: r.maxRetries,
    retryDelay: r.retryDelay,
    allowDuplicates: r.allowDuplicates,
    frequencyCap: r.frequencyCap,
    sentCount: r.sentCount,
    failedCount: r.failedCount,
    lastTriggered: r.lastTriggered?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session instanceof NextResponse) return session

    const { searchParams } = new URL(request.url)
    const trigger = searchParams.get('trigger')
    const recipientType = searchParams.get('recipientType')
    const isActive = searchParams.get('isActive')

    const where: Prisma.AutomationRuleWhereInput = {}
    if (trigger) where.trigger = trigger as never
    if (recipientType) where.recipientType = recipientType as never
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true'
    }
    // Note: channel filter on JSON array omitted for compatibility

    const rules = await prisma.automationRule.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({
      rules: rules.map(mapRuleToResponse),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canUpdate = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE)
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createAutomationRuleSchema.parse(body)

    const rule = await prisma.automationRule.create({
      data: {
        name: parsed.name,
        description: parsed.description ?? undefined,
        isActive: parsed.isActive,
        priority: parsed.priority,
        trigger: parsed.trigger as never,
        triggerDelay: parsed.triggerDelay ?? parsed.delayMinutes ?? 0,
        delayMinutes: parsed.delayMinutes ?? parsed.triggerDelay ?? 0,
        channels: parsed.channels as never,
        templateId: parsed.templateId ?? undefined,
        conditions: (parsed.conditions ?? undefined) as never,
        sendWindow: (parsed.sendWindow ?? undefined) as never,
        timezone: parsed.timezone ?? 'Asia/Riyadh',
        respectDND: parsed.respectDND,
        recipientType: parsed.recipientType as never,
        specificRecipients: (parsed.specificRecipients ?? undefined) as never,
        maxRetries: parsed.maxRetries ?? 3,
        retryDelay: parsed.retryDelay ?? 5,
        allowDuplicates: parsed.allowDuplicates ?? false,
        frequencyCap: (parsed.frequencyCap ?? undefined) as never,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json({
      rule: mapRuleToResponse(rule),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
