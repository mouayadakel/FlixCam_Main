import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

const PUBLIC_KEYS = new Set([
  'business_logo',
  'site_name',
  'site_name_ar',
])

async function getCachedBranding() {
  return unstable_cache(
    async () => {
      const rows = await prisma.marketingSettings.findMany({
        where: {
          key: { in: Array.from(PUBLIC_KEYS) }
        }
      })

      const data = rows.reduce((acc, row) => {
        acc[row.key] = row.value
        return acc
      }, {} as Record<string, string>)

      return {
        logoUrl: data['business_logo'] || '',
        siteName: data['site_name'] || 'FlixCam',
        siteNameAr: data['site_name_ar'] || 'فليكس كام',
      }
    },
    ['public-branding-data'],
    { revalidate: 3600, tags: ['public-branding'] }
  )()
}

export async function GET() {
  try {
    const data = await getCachedBranding()

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    return NextResponse.json({ logoUrl: '', siteName: 'FlixCam' }, { status: 200 })
  }
}
