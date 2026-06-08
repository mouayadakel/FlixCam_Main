/**
 * POST /api/portal/data-deletion — anonymize customer account (GDPR)
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GdprService } from '@/lib/services/gdpr.service'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    await GdprService.anonymizeUser(session.user.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
