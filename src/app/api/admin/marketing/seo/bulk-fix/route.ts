import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { generateSEO } from '@/lib/services/seo-generation.service'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type } = await req.json()
    if (!type) return NextResponse.json({ error: 'Missing type' }, { status: 400 })

    // 1. Get all gaps of this type
    if (type === 'Equipment') {
      const gaps = await prisma.productTranslation.findMany({
        where: { locale: 'ar', seoDescription: '' },
        select: { id: true, name: true, shortDescription: true },
        take: 10
      })

      for (const gap of gaps) {
        const result = await generateSEO({
          name: gap.name,
          description: gap.shortDescription || gap.name,
          locale: 'ar'
        }, 'gemini')

        await prisma.productTranslation.update({
          where: { id: gap.id },
          data: {
            seoTitle: result.metaTitle,
            seoDescription: result.metaDescription,
          }
        })
      }
      return NextResponse.json({ success: true, count: gaps.length })
    } else if (type === 'Studio') {
      const gaps = await prisma.studio.findMany({
        where: { OR: [{ metaDescription: '' }, { metaDescription: null }] },
        select: { id: true, name: true, description: true },
        take: 10
      })

      for (const gap of gaps) {
        const result = await generateSEO({
          name: gap.name,
          description: gap.description || gap.name,
          locale: 'ar'
        }, 'gemini')

        await prisma.studio.update({
          where: { id: gap.id },
          data: {
            metaTitle: result.metaTitle,
            metaDescription: result.metaDescription,
          }
        })
      }
      return NextResponse.json({ success: true, count: gaps.length })
    }

    return NextResponse.json({ success: true, count: 0 })
  } catch (error: any) {
    console.error('SEO Bulk Fix failed:', error)
    return NextResponse.json({ error: 'Failed to run bulk fix' }, { status: 500 })
  }
}
