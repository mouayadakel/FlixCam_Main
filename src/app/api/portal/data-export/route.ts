/**
 * GET /api/portal/data-export — GDPR JSON export for logged-in customer
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GdprService } from '@/lib/services/gdpr.service'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    const data = await GdprService.exportUserData(session.user.id)
    return NextResponse.json(data, {
      headers: {
        'Content-Disposition': `attachment; filename="flixcam-data-${session.user.id}.json"`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
