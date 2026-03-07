/**
 * GET – get brand (via main footer)
 * PUT – update footer brand
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { footerBrandSchema } from '@/lib/validators/footer.validator'

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
    const parsed = footerBrandSchema.safeParse(body)
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

    await prisma.footerBrand.upsert({
      where: { footerId: footer.id },
      create: {
        footerId: footer.id,
        logoLight: parsed.data.logoLight,
        logoDark: parsed.data.logoDark,
        companyNameAr: parsed.data.companyNameAr,
        companyNameEn: parsed.data.companyNameEn,
        descriptionAr: parsed.data.descriptionAr,
        descriptionEn: parsed.data.descriptionEn,
        showBrand: parsed.data.showBrand ?? true,
      },
      update: {
        logoLight: parsed.data.logoLight,
        logoDark: parsed.data.logoDark,
        companyNameAr: parsed.data.companyNameAr,
        companyNameEn: parsed.data.companyNameEn,
        descriptionAr: parsed.data.descriptionAr,
        descriptionEn: parsed.data.descriptionEn,
        showBrand: parsed.data.showBrand ?? true,
      },
    })

    const updated = await prisma.footerSettings.findFirst({
      where: { id: footer.id },
      include: { brand: true },
    })
    return NextResponse.json(updated?.brand ?? null)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PUT /api/admin/cms/footer/brand]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
