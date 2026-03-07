/**
 * PUT  – update link
 * DELETE – delete link
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { footerLinkSchema } from '@/lib/validators/footer.validator'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
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

    const { linkId } = await params
    const body = await request.json()
    const parsed = footerLinkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const link = await prisma.footerLink.update({
      where: { id: linkId },
      data: {
        textAr: parsed.data.textAr,
        textEn: parsed.data.textEn,
        linkType: parsed.data.linkType,
        url: parsed.data.url,
        icon: parsed.data.icon ?? undefined,
        openNewTab: parsed.data.openNewTab,
        ...(parsed.data.order !== undefined && { order: parsed.data.order }),
        ...(parsed.data.enabled !== undefined && { enabled: parsed.data.enabled }),
        categoryId: parsed.data.categoryId ?? undefined,
        pageSlug: parsed.data.pageSlug ?? undefined,
      },
    })
    return NextResponse.json(link)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PUT /api/admin/cms/footer/columns/[id]/links/[linkId]]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
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

    const { linkId } = await params
    await prisma.footerLink.delete({ where: { id: linkId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[DELETE /api/admin/cms/footer/columns/[id]/links/[linkId]]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
