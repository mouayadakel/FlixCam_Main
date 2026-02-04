/**
 * @file route.ts
 * @description API route for individual media operations
 * @module app/api/media/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { MediaService } from '@/lib/services/media.service'

/**
 * DELETE /api/media/[id] - Delete media
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await MediaService.deleteMedia(params.id, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting media:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete media' },
      { status: 400 }
    )
  }
}
