/**
 * GET /api/promissory-notes/booking/[bookingId]/preview – Preview data for PN sign page
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getBookingPreviewForPn } from '@/lib/services/promissory-note.service'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookingId } = await params
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
    }

    const data = await getBookingPreviewForPn(bookingId, session.user.id)
    return NextResponse.json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
