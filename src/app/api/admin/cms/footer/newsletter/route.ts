/**
 * PUT – update newsletter settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { footerNewsletterSchema } from '@/lib/validators/footer.validator'

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
    const parsed = footerNewsletterSchema.safeParse(body)
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

    const newsletter = await prisma.footerNewsletter.upsert({
      where: { footerId: footer.id },
      create: {
        footerId: footer.id,
        enabled: parsed.data.enabled ?? false,
        titleAr: parsed.data.titleAr,
        titleEn: parsed.data.titleEn,
        descriptionAr: parsed.data.descriptionAr,
        descriptionEn: parsed.data.descriptionEn,
        placeholderAr: parsed.data.placeholderAr,
        placeholderEn: parsed.data.placeholderEn,
        buttonTextAr: parsed.data.buttonTextAr,
        buttonTextEn: parsed.data.buttonTextEn,
        successMessageAr: parsed.data.successMessageAr,
        successMessageEn: parsed.data.successMessageEn,
      },
      update: {
        enabled: parsed.data.enabled,
        titleAr: parsed.data.titleAr,
        titleEn: parsed.data.titleEn,
        descriptionAr: parsed.data.descriptionAr,
        descriptionEn: parsed.data.descriptionEn,
        placeholderAr: parsed.data.placeholderAr,
        placeholderEn: parsed.data.placeholderEn,
        buttonTextAr: parsed.data.buttonTextAr,
        buttonTextEn: parsed.data.buttonTextEn,
        successMessageAr: parsed.data.successMessageAr,
        successMessageEn: parsed.data.successMessageEn,
      },
    })
    return NextResponse.json(newsletter)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PUT /api/admin/cms/footer/newsletter]', error)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
