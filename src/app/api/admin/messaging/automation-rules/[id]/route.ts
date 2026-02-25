/**
 * GET – get single automation rule by id
 * PATCH – update automation rule
 * DELETE – delete automation rule
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { handleApiError } from '@/lib/utils/api-helpers'
import { updateAutomationRuleSchema } from '@/lib/validators/automation-rule.validator'

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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canRead = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_READ)
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    const rule = await prisma.automationRule.findUnique({
      where: { id },
    })
    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    return NextResponse.json({ rule: mapRuleToResponse(rule) })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canUpdate = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE)
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()
    const parsed = updateAutomationRuleSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (parsed.name !== undefined) updateData.name = parsed.name
    if (parsed.description !== undefined) updateData.description = parsed.description
    if (parsed.isActive !== undefined) updateData.isActive = parsed.isActive
    if (parsed.priority !== undefined) updateData.priority = parsed.priority
    if (parsed.trigger !== undefined) updateData.trigger = parsed.trigger
    if (parsed.triggerDelay !== undefined) updateData.triggerDelay = parsed.triggerDelay
    if (parsed.delayMinutes !== undefined) updateData.delayMinutes = parsed.delayMinutes
    if (parsed.channels !== undefined) updateData.channels = parsed.channels
    if (parsed.templateId !== undefined) updateData.templateId = parsed.templateId
    if (parsed.conditions !== undefined) updateData.conditions = parsed.conditions
    if (parsed.sendWindow !== undefined) updateData.sendWindow = parsed.sendWindow
    if (parsed.timezone !== undefined) updateData.timezone = parsed.timezone
    if (parsed.respectDND !== undefined) updateData.respectDND = parsed.respectDND
    if (parsed.recipientType !== undefined) updateData.recipientType = parsed.recipientType
    if (parsed.specificRecipients !== undefined)
      updateData.specificRecipients = parsed.specificRecipients
    if (parsed.maxRetries !== undefined) updateData.maxRetries = parsed.maxRetries
    if (parsed.retryDelay !== undefined) updateData.retryDelay = parsed.retryDelay
    if (parsed.allowDuplicates !== undefined) updateData.allowDuplicates = parsed.allowDuplicates
    if (parsed.frequencyCap !== undefined) updateData.frequencyCap = parsed.frequencyCap
    updateData.updatedBy = session.user.id

    const rule = await prisma.automationRule.update({
      where: { id },
      data: updateData as never,
    })

    return NextResponse.json({ rule: mapRuleToResponse(rule) })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canUpdate = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE)
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    await prisma.automationRule.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
