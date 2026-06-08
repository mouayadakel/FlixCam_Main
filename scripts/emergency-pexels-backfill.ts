/**
 * Last-resort photo backfill via Pexels for equipment with zero images.
 * Uses simple product-name queries (not site: B&H queries). Skips Gemini validation.
 *
 * Run: npx tsx scripts/emergency-pexels-backfill.ts
 */

import 'dotenv/config'
import { PrismaClient, ImageSource } from '@prisma/client'
import { processImageFromUrl } from '../src/lib/services/image-processing.service'
import {
  promoteApprovedPhotosToProduct,
  isPlaceholderUrl,
} from '../src/lib/services/product-photo.service'
import { syncProductToEquipment } from '../src/lib/services/product-equipment-sync.service'

const prisma = new PrismaClient()
const PRODUCTS_FOLDER = 'products'

function buildPexelsQuery(
  name: string,
  brand: string | null | undefined,
  category: string | null | undefined
): string {
  const parts = [brand, name, category].filter(Boolean).join(' ')
  return parts.replace(/site:\S+/gi, '').replace(/"/g, '').trim().slice(0, 80) || 'professional camera equipment'
}

async function fetchPexelsPhoto(query: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) return null

  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3`,
    { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(15000) }
  )
  if (!res.ok) return null

  const data = (await res.json()) as {
    photos?: Array<{ src?: { large?: string; original?: string } }>
  }
  for (const photo of data.photos ?? []) {
    const url = photo.src?.large ?? photo.src?.original
    if (url) return url
  }
  return null
}

async function main() {
  const missing = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      productId: { not: null },
      NOT: { media: { some: { deletedAt: null, type: 'image' } } },
    },
    include: {
      product: {
        include: { brand: true, category: true, translations: true },
      },
    },
    orderBy: { sku: 'asc' },
  })

  console.log(`Emergency Pexels backfill for ${missing.length} items\n`)

  let ok = 0
  let fail = 0

  for (const eq of missing) {
    const product = eq.product
    if (!product) {
      fail++
      continue
    }

    const en = product.translations.find((t) => t.locale === 'en')
    const name = en?.name ?? eq.model ?? eq.sku ?? 'equipment'
    const query = buildPexelsQuery(name, product.brand?.name, product.category?.name)

    const remoteUrl = await fetchPexelsPhoto(query)
    if (!remoteUrl) {
      console.log(`  ✗ ${eq.sku}: no Pexels result for "${query}"`)
      fail++
      continue
    }

    const uploaded = await processImageFromUrl(remoteUrl, PRODUCTS_FOLDER, {
      allowExternalDomains: true,
    })
    if (!uploaded.success || !uploaded.url || isPlaceholderUrl(uploaded.url)) {
      console.log(`  ✗ ${eq.sku}: upload failed`)
      fail++
      continue
    }

    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: uploaded.url,
        imageSource: ImageSource.STOCK_PHOTO,
        pendingReview: false,
        isPrimary: true,
        sortOrder: 0,
        sourceQuery: query,
        sourceDomain: 'pexels.com',
        cloudinaryPublicId: uploaded.publicId ?? null,
      },
    })

    await promoteApprovedPhotosToProduct(product.id)
    await syncProductToEquipment(product.id)

    console.log(`  ✓ ${eq.sku}: ${uploaded.url.slice(0, 70)}`)
    ok++
  }

  const still = await prisma.equipment.count({
    where: {
      deletedAt: null,
      isActive: true,
      NOT: { media: { some: { deletedAt: null, type: 'image' } } },
    },
  })

  console.log(`\nDone: ${ok} ok, ${fail} failed. Still missing: ${still}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
