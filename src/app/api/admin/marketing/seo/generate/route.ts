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

    const { id, type, name, description, category, brand, locale } = await req.json()

    if (!id || !type) {
      return NextResponse.json({ error: 'Missing ID or Type' }, { status: 400 })
    }

    // 1. Generate SEO using the existing service
    const result = await generateSEO({
      name,
      description: description || name,
      category,
      brand,
      locale: locale || 'ar'
    }, 'gemini')

    // 2. Update the translation record in DB
    if (type === 'Equipment') {
      await prisma.productTranslation.update({
        where: { id },
        data: {
          seoTitle: result.metaTitle,
          seoDescription: result.metaDescription,
        }
      })
    } else if (type === 'Studio') {
      await prisma.studio.update({
        where: { id },
        data: {
          metaTitle: result.metaTitle,
          metaDescription: result.metaDescription,
        }
      })
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('SEO Generation failed:', error)
    return NextResponse.json({ error: 'Failed to generate SEO' }, { status: 500 })
  }
}
