/**
 * GET/PATCH /api/admin/settings/chatbot
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { ChatbotSettingsService } from '@/lib/services/chatbot-settings.service'
import { handleApiError } from '@/lib/utils/api-helpers'
import { ForbiddenError, UnauthorizedError } from '@/lib/errors'

const updateSchema = z.object({
  greetingAr: z.string().optional().nullable(),
  greetingEn: z.string().optional().nullable(),
  tone: z.string().optional(),
  companyName: z.string().optional().nullable(),
  faqEntries: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .optional(),
})

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    if (!(await hasPermission(session.user.id, PERMISSIONS.SETTINGS_READ))) {
      throw new ForbiddenError()
    }
    const settings = await ChatbotSettingsService.get()
    return NextResponse.json({ data: settings })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    if (!(await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE))) {
      throw new ForbiddenError()
    }
    const body = updateSchema.parse(await request.json())
    const settings = await ChatbotSettingsService.upsert(body, session.user.id)
    return NextResponse.json({ data: settings })
  } catch (error) {
    return handleApiError(error)
  }
}
