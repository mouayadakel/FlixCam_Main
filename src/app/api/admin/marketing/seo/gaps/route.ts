import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId || !(await hasPermission(userId, PERMISSIONS.MARKETING_READ))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const products = await prisma.productTranslation.findMany({
      where: {
        locale: 'ar',
        OR: [{ seoTitle: '' }, { seoDescription: '' }]
      },
      select: {
        id: true,
        name: true,
        seoTitle: true,
        seoDescription: true,
        productId: true,
      },
      take: 100
    })

    const studios = await prisma.studio.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [
          { metaTitle: null },
          { metaTitle: '' },
          { metaDescription: null },
          { metaDescription: '' }
        ]
      },
      select: {
        id: true,
        name: true,
        metaTitle: true,
        metaDescription: true,
      },
      take: 100
    })

    const gaps = [
      ...products.map(p => ({
        id: p.id,
        type: 'Equipment',
        name: p.name,
        slug: '/admin/inventory/' + p.productId,
        missingTitle: !p.seoTitle?.trim(),
        missingDesc: !p.seoDescription?.trim()
      })),
      ...studios.map(s => ({
        id: s.id,
        type: 'Studio',
        name: s.name,
        slug: '/admin/studios/' + s.id,
        missingTitle: !s.metaTitle?.trim(),
        missingDesc: !s.metaDescription?.trim()
      }))
    ]

    const totalCount = await prisma.productTranslation.count({ where: { locale: 'ar' } })
    const missingCount = gaps.filter(g => g.type === 'Equipment').length

    let score = 100
    if (totalCount > 0) {
      score = Math.round(((totalCount - missingCount) / totalCount) * 100)
    }

    // Let's also check missing global tags
    const globalSettings = await prisma.siteSetting.findMany({
       where: { key: { in: ['seo.default_title', 'seo.default_description'] } }
    })
    
    const missingGlobal = globalSettings.filter(s => !s.value?.trim()).length

    if (missingGlobal > 0) {
       score -= 20
    }

    return NextResponse.json({ gaps, score: Math.max(0, score), totalCount, missingCount })
  } catch (err) {
    console.error('SEO Gaps API Error:', err)
    return NextResponse.json({ gaps: [], score: 0, totalCount: 0, missingCount: 0 })
  }
}
