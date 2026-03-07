/**
 * POST – create column
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { footerColumnSchema } from '@/lib/validators/footer.validator'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const parsed = footerColumnSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const footer = await prisma.footerSettings.findFirst()
    if (!footer) {
      return NextResponse.json(
        { error: 'Footer settings not found. Run footer seed first.' },
        { status: 404 }
      )
    }

    const maxOrder = await prisma.footerColumn
      .findFirst({
        where: { footerId: footer.id },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      .then((r) => r?.order ?? -1)

    const column = await prisma.footerColumn.create({
      data: {
        footerId: footer.id,
        titleAr: parsed.data.titleAr,
        titleEn: parsed.data.titleEn,
        showTitle: parsed.data.showTitle ?? true,
        order: parsed.data.order ?? maxOrder + 1,
        enabled: parsed.data.enabled ?? true,
      },
    })
    return NextResponse.json(column)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[POST /api/admin/cms/footer/columns]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
