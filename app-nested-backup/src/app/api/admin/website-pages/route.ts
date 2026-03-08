/**
 * GET /api/admin/website-pages - List website pages (Phase 5.1)
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canRead = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_READ)
    const canUpdate = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE)
    if (!canRead && !canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pages = await prisma.websitePage.findMany({
      orderBy: { slug: 'asc' },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          select: { id: true, type: true, order: true, isVisible: true },
        },
      },
    })

    return NextResponse.json({
      pages: pages.map((p) => ({
        id: p.id,
        slug: p.slug,
        titleAr: p.titleAr,
        titleEn: p.titleEn,
        titleZh: p.titleZh,
        isPublished: p.isPublished,
        seo: p.seo,
        sectionsCount: p.sections.length,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Admin website-pages list error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
