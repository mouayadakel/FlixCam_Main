/**
 * POST/DELETE /api/clients/[id]/blacklist
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { BlacklistService } from '@/lib/services/blacklist.service'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const reason = typeof body.reason === 'string' ? body.reason : ''
    await BlacklistService.blacklist(id, reason, session.user.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    const { id } = await context.params
    await BlacklistService.unblacklist(id, session.user.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
