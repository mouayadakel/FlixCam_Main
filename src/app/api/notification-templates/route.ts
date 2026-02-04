/**
 * @file route.ts
 * @description Notification templates API – list and create
 * @module app/api/notification-templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { createNotificationTemplateSchema } from '@/lib/validators/notification-template.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'
import type { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const { searchParams } = new URL(request.url)
    const trigger = searchParams.get('trigger')
    const channel = searchParams.get('channel')
    const isActive = searchParams.get('isActive')
    const language = searchParams.get('language')

    const where: Prisma.NotificationTemplateWhereInput = {}
    if (trigger) where.trigger = trigger as Prisma.EnumNotificationTriggerFilter
    if (channel) where.channel = channel as Prisma.EnumNotificationChannelFilter
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true'
    }
    if (language) where.language = language

    const templates = await prisma.notificationTemplate.findMany({
      where,
      orderBy: [{ trigger: 'asc' }, { channel: 'asc' }, { language: 'asc' }],
    })

    const shape = templates.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description ?? null,
      trigger: t.trigger,
      channel: t.channel,
      subject: t.subject ?? null,
      bodyText: t.bodyText,
      bodyHtml: t.bodyHtml ?? null,
      variables: t.variables ?? null,
      isActive: t.isActive,
      language: t.language,
      variant: t.variant ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))

    return NextResponse.json({ templates: shape })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const body = await request.json()
    const parsed = createNotificationTemplateSchema.parse(body)

    const variablesJson: Prisma.InputJsonValue | undefined =
      parsed.variables && Array.isArray(parsed.variables) ? parsed.variables : undefined

    const template = await prisma.notificationTemplate.create({
      data: {
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description ?? null,
        trigger: parsed.trigger,
        channel: parsed.channel,
        subject: parsed.subject ?? null,
        bodyText: parsed.bodyText,
        bodyHtml: parsed.bodyHtml ?? null,
        variables: variablesJson ?? undefined,
        isActive: parsed.isActive ?? true,
        language: parsed.language ?? 'en',
        variant: parsed.variant ?? null,
      },
    })

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        slug: template.slug,
        description: template.description ?? null,
        trigger: template.trigger,
        channel: template.channel,
        subject: template.subject ?? null,
        bodyText: template.bodyText,
        bodyHtml: template.bodyHtml ?? null,
        variables: template.variables ?? null,
        isActive: template.isActive,
        language: template.language,
        variant: template.variant ?? null,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
