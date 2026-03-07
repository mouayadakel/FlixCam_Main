/**
 * PUT – update legal section and its links
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { footerLegalSchema } from '@/lib/validators/footer.validator'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest) {
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
    const parsed = footerLegalSchema.safeParse(body)
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

    const legal = await prisma.footerLegal.upsert({
      where: { footerId: footer.id },
      create: {
        footerId: footer.id,
        copyrightAr: parsed.data.copyrightAr,
        copyrightEn: parsed.data.copyrightEn,
        autoYear: parsed.data.autoYear ?? true,
        layout: parsed.data.layout ?? 'center',
      },
      update: {
        copyrightAr: parsed.data.copyrightAr,
        copyrightEn: parsed.data.copyrightEn,
        autoYear: parsed.data.autoYear,
        layout: parsed.data.layout,
      },
    })

    if (parsed.data.links !== undefined) {
      await prisma.footerLegalLink.deleteMany({ where: { legalId: legal.id } })
      if (parsed.data.links.length > 0) {
        await prisma.footerLegalLink.createMany({
          data: parsed.data.links.map((l, i) => ({
            legalId: legal.id,
            textAr: l.textAr,
            textEn: l.textEn,
            url: l.url,
            order: l.order ?? i,
            enabled: l.enabled ?? true,
          })),
        })
      }
    }

    const updated = await prisma.footerLegal.findUnique({
      where: { id: legal.id },
      include: { links: { orderBy: { order: 'asc' } } },
    })
    return NextResponse.json(updated)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PUT /api/admin/cms/footer/legal]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
