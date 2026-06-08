
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { generateSlug, ensureUniqueEquipmentSlug } from '@/lib/utils/slug.utils'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const equipment = await prisma.equipment.findMany({
      where: {
        slug: null,
        deletedAt: null
      },
      select: {
        id: true,
        model: true,
        sku: true,
        nameEn: true
      }
    })

    let updatedCount = 0
    const results = []

    for (const item of equipment) {
      const baseSlug = generateSlug(item.nameEn || item.model || item.sku || 'equipment')
      const slug = await ensureUniqueEquipmentSlug(prisma, baseSlug, item.id)
      
      await prisma.equipment.update({
        where: { id: item.id },
        data: { slug }
      })
      
      updatedCount++
      results.push({ id: item.id, sku: item.sku, slug })
    }

    return NextResponse.json({
      message: `Successfully backfilled ${updatedCount} slugs`,
      updatedCount,
      // results: results.slice(0, 10) // Only show first 10
    })
  } catch (error) {
    console.error('[BackfillSlugs]', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal Server Error'
    }, { status: 500 })
  }
}
