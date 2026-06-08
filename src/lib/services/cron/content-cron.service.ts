/**
 * Content & SEO cron jobs.
 */

import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/db/prisma'
import { revalidatePath } from 'next/cache'
import { wrapCronJob } from './cron-utils'

const BASE = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'
const FEEDS_DIR = path.join(process.cwd(), 'public', 'feeds')

export const runSitemapRebuild = wrapCronJob('sitemap-rebuild', async () => {
  revalidatePath('/sitemap.xml')

  const equipment = await prisma.equipment.count({
    where: { deletedAt: null, isActive: true, slug: { not: null } },
  })

  const sitemapUrl = `${BASE}/sitemap.xml`
  let pingOk = false
  try {
    const ping = await fetch(
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      { method: 'GET', signal: AbortSignal.timeout(10_000) }
    )
    pingOk = ping.ok
  } catch {
    pingOk = false
  }

  return {
    revalidated: '/sitemap.xml',
    activeEquipmentUrls: equipment,
    baseUrl: BASE,
    googlePing: pingOk,
  }
})

export const runSchemaRefresh = wrapCronJob('schema-refresh', async () => {
  revalidatePath('/equipment')
  revalidatePath('/')

  const updated = await prisma.equipment.count({
    where: {
      deletedAt: null,
      isActive: true,
      updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) },
    },
  })

  return { pagesRevalidated: ['/', '/equipment'], recentlyUpdatedEquipment: updated }
})

export const runProductFeeds = wrapCronJob('product-feeds', async () => {
  await fs.mkdir(FEEDS_DIR, { recursive: true })

  const items = await prisma.equipment.findMany({
    where: { deletedAt: null, isActive: true },
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true } },
      media: { take: 1, orderBy: { sortOrder: 'asc' } },
    },
    take: 1000,
  })

  const googleLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '<channel>',
    `<title>FlixCam Equipment</title>`,
    `<link>${BASE}</link>`,
    `<description>FlixCam rental catalog</description>`,
  ]

  const facebookRows = [
    'id,title,description,availability,condition,price,link,image_link,brand',
  ]

  for (const item of items) {
    const slug = item.slug || item.id
    const link = `${BASE}/equipment/${slug}`
    const image = item.media[0]?.url ? `${BASE}${item.media[0].url}` : ''
    const price = `${Number(item.dailyPrice).toFixed(2)} SAR`
    const title = item.model || item.sku
    const desc = item.descriptionEn || item.model || item.sku

    googleLines.push(
      '<item>',
      `<g:id>${item.sku}</g:id>`,
      `<g:title>${escapeXml(title)}</g:title>`,
      `<g:description>${escapeXml(desc)}</g:description>`,
      `<g:link>${link}</g:link>`,
      `<g:image_link>${image}</g:image_link>`,
      `<g:availability>${item.quantityAvailable > 0 ? 'in stock' : 'out of stock'}</g:availability>`,
      `<g:price>${price}</g:price>`,
      `<g:brand>${escapeXml(item.brand?.name ?? 'FlixCam')}</g:brand>`,
      `<g:condition>used</g:condition>`,
      '</item>'
    )

    facebookRows.push(
      [
        item.sku,
        csvEscape(title),
        csvEscape(desc),
        item.quantityAvailable > 0 ? 'in stock' : 'out of stock',
        'used',
        price,
        link,
        image,
        csvEscape(item.brand?.name ?? 'FlixCam'),
      ].join(',')
    )
  }

  googleLines.push('</channel>', '</rss>')

  const googlePath = path.join(FEEDS_DIR, 'google-shopping.xml')
  const facebookPath = path.join(FEEDS_DIR, 'facebook-catalog.csv')

  const googleXml = googleLines.join('\n')
  await fs.writeFile(googlePath, googleXml, 'utf8')
  await fs.writeFile(facebookPath, facebookRows.join('\n'), 'utf8')

  const feedValid =
    googleXml.includes('<rss') &&
    googleXml.includes('</rss>') &&
    items.length > 0 &&
    !googleXml.includes('<g:id></g:id>')

  return {
    itemsExported: items.length,
    googleFeed: '/feeds/google-shopping.xml',
    facebookFeed: '/feeds/facebook-catalog.csv',
    feedValid,
  }
})

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function csvEscape(s: string): string {
  if (s.includes(',') || s.includes('"')) return `"${s.replace(/"/g, '""')}"`
  return s
}
