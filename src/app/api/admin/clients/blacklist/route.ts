/**
 * GET /api/admin/clients/blacklist — list blacklisted customers
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { BlacklistService } from '@/lib/services/blacklist.service'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    if (!(await hasPermission(session.user.id, PERMISSIONS.CLIENT_BLACKLIST))) {
      throw new ForbiddenError()
    }
    const data = await BlacklistService.listBlacklisted()
    return NextResponse.json({ data })
  } catch (error) {
    return handleApiError(error)
  }
}
