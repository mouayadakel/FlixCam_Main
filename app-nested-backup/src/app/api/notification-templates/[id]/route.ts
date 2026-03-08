/**
 * @file route.ts
 * @description Single notification template – get, update, delete
 * @module app/api/notification-templates/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { updateNotificationTemplateSchema } from '@/lib/validators/notification-template.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'
import type { Prisma } from '@prisma/client'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()
    const { id } = await params
    const template = await prisma.notificationTemplate.findUnique({ where: { id } })
    if (!template) throw new NotFoundError('Notification template', id)
    return NextResponse.json({
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
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()
    const { id } = await params
    const existing = await prisma.notificationTemplate.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('Notification template', id)

    const body = await request.json()
    const parsed = updateNotificationTemplateSchema.parse(body)

    const updateData: Prisma.NotificationTemplateUpdateInput = {}
    if (parsed.name !== undefined) updateData.name = parsed.name
    if (parsed.slug !== undefined) updateData.slug = parsed.slug
    if (parsed.description !== undefined) updateData.description = parsed.description
    if (parsed.trigger !== undefined) updateData.trigger = parsed.trigger
    if (parsed.channel !== undefined) updateData.channel = parsed.channel
    if (parsed.subject !== undefined) updateData.subject = parsed.subject
    if (parsed.bodyText !== undefined) updateData.bodyText = parsed.bodyText
    if (parsed.bodyHtml !== undefined) updateData.bodyHtml = parsed.bodyHtml
    if (parsed.variables !== undefined)
      updateData.variables = (parsed.variables ?? null) as Prisma.InputJsonValue
    if (parsed.isActive !== undefined) updateData.isActive = parsed.isActive
    if (parsed.language !== undefined) updateData.language = parsed.language
    if (parsed.variant !== undefined) updateData.variant = parsed.variant

    const template = await prisma.notificationTemplate.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json({
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
    })
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
    const existing = await prisma.notificationTemplate.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('Notification template', id)
    await prisma.notificationTemplate.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
