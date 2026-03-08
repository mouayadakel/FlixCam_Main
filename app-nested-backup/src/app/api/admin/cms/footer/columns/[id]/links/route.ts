/**
 * POST – create link in column
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { footerLinkSchema } from '@/lib/validators/footer.validator'

export const dynamic = 'force-dynamic'

export async function POST(
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

    const { id: columnId } = await params
    const body = await request.json()
    const parsed = footerLinkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const maxOrder = await prisma.footerLink
      .findFirst({
        where: { columnId },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      .then((r) => r?.order ?? -1)

    const link = await prisma.footerLink.create({
      data: {
        columnId,
        textAr: parsed.data.textAr,
        textEn: parsed.data.textEn,
        linkType: parsed.data.linkType,
        url: parsed.data.url,
        icon: parsed.data.icon ?? null,
        openNewTab: parsed.data.openNewTab ?? false,
        order: parsed.data.order ?? maxOrder + 1,
        enabled: parsed.data.enabled ?? true,
        categoryId: parsed.data.categoryId ?? null,
        pageSlug: parsed.data.pageSlug ?? null,
      },
    })
    return NextResponse.json(link)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[POST /api/admin/cms/footer/columns/[id]/links]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
