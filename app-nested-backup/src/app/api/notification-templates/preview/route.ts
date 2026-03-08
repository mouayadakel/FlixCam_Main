/**
 * @file route.ts
 * @description Preview notification template with sample data (Handlebars-style placeholders)
 * @module app/api/notification-templates/preview
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { previewNotificationTemplateSchema } from '@/lib/validators/notification-template.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'

function simpleCompile(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = data[key]
    return value != null ? String(value) : ''
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const body = await request.json()
    const parsed = previewNotificationTemplateSchema.parse(body)

    let template: { subject: string | null; bodyText: string; bodyHtml: string | null } | null =
      null

    if (parsed.templateId) {
      const t = await prisma.notificationTemplate.findUnique({
        where: { id: parsed.templateId },
      })
      if (!t) throw new NotFoundError('Notification template', parsed.templateId)
      template = { subject: t.subject, bodyText: t.bodyText, bodyHtml: t.bodyHtml }
    } else if (parsed.slug) {
      const t = await prisma.notificationTemplate.findUnique({
        where: {
          slug_language: { slug: parsed.slug, language: parsed.language ?? 'en' },
        },
      })
      if (!t) throw new NotFoundError('Notification template', parsed.slug)
      template = { subject: t.subject, bodyText: t.bodyText, bodyHtml: t.bodyHtml }
    }

    if (!template) {
      return NextResponse.json({ error: 'Provide templateId or slug' }, { status: 400 })
    }

    const data = (parsed.data ?? {}) as Record<string, unknown>
    const subject = template.subject ? simpleCompile(template.subject, data) : null
    const bodyText = simpleCompile(template.bodyText, data)
    const bodyHtml = template.bodyHtml ? simpleCompile(template.bodyHtml, data) : null

    return NextResponse.json({
      subject,
      bodyText,
      bodyHtml,
      data,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
