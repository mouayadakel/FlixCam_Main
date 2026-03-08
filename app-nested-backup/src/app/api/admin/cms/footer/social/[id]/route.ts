/**
 * PUT  – update social link
 * DELETE – delete social link
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { footerSocialLinkSchema } from '@/lib/validators/footer.validator'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE))) {
      return NextResponse.json(
        { error: 'Forbidden - settings.update required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const parsed = footerSocialLinkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const link = await prisma.footerSocialLink.update({
      where: { id },
      data: {
        platform: parsed.data.platform,
        url: parsed.data.url,
        displayNameAr: parsed.data.displayNameAr ?? undefined,
        displayNameEn: parsed.data.displayNameEn ?? undefined,
        customIcon: parsed.data.customIcon ?? undefined,
        ...(parsed.data.order !== undefined && { order: parsed.data.order }),
        ...(parsed.data.enabled !== undefined && { enabled: parsed.data.enabled }),
      },
    })
    return NextResponse.json(link)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PUT /api/admin/cms/footer/social/[id]]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE))) {
      return NextResponse.json(
        { error: 'Forbidden - settings.update required' },
        { status: 403 }
      )
    }

    const { id } = await params
    await prisma.footerSocialLink.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[DELETE /api/admin/cms/footer/social/[id]]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
