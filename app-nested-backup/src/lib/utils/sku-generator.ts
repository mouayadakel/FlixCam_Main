/**
 * @file sku-generator.ts
 * @description Auto-generate SKUs with pattern: {CATEGORY_PREFIX}-{BRAND_ABBR}-{RANDOM_4_DIGITS}
 * @module lib/utils
 */

import { prisma } from '@/lib/db/prisma'

const CATEGORY_PREFIX_MAP: Record<string, string> = {
  camera: 'CAM',
  cameras: 'CAM',
  'cinema camera': 'CAM',
  'camera acc': 'ACC',
  'camera accessories': 'ACC',
  accessories: 'ACC',
  lenses: 'LNS',
  lens: 'LNS',
  tripod: 'TRP',
  tripodgimbals: 'TRP',
  tripods: 'TRP',
  gimbals: 'GMB',
  gimbal: 'GMB',
  light: 'LGT',
  lights: 'LGT',
  lighting: 'LGT',
  'light acc': 'LGA',
  'lighting accessories': 'LGA',
  sound: 'SND',
  audio: 'SND',
  grips: 'GRP',
  grip: 'GRP',
  monitors: 'MON',
  monitor: 'MON',
  battery: 'BAT',
  batteries: 'BAT',
  boxes: 'BOX',
  cases: 'BOX',
  live: 'LIV',
  'live and mixing': 'LIV',
  mixing: 'MIX',
  drone: 'DRN',
  drones: 'DRN',
  studio: 'STD',
  general: 'GEN',
}

function getCategoryPrefix(categoryName: string): string {
  const normalized = categoryName.toLowerCase().trim()
  return CATEGORY_PREFIX_MAP[normalized] || normalized.slice(0, 3).toUpperCase()
}

function getBrandAbbr(brandName: string): string {
  const cleaned = brandName.trim().toUpperCase()
  if (cleaned.length <= 4) return cleaned
  const words = cleaned.split(/[\s-]+/)
  if (words.length >= 2) {
    return words
      .map((w) => w[0])
      .join('')
      .slice(0, 4)
  }
  return cleaned.slice(0, 4)
}

function randomDigits(length: number): string {
  return String(Math.floor(Math.random() * Math.pow(10, length))).padStart(length, '0')
}

/**
 * Generate a SKU like CAM-SONY-0042
 */
export function generateSKU(categoryName: string, brandName: string): string {
  const prefix = getCategoryPrefix(categoryName)
  const brand = getBrandAbbr(brandName)
  const digits = randomDigits(4)
  return `${prefix}-${brand}-${digits}`
}

/**
 * Generate a unique SKU by checking against the database
 * Retries up to 10 times if collision detected
 */
export async function generateUniqueSKU(categoryName: string, brandName: string): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const sku = generateSKU(categoryName, brandName)
    const existing = await prisma.product.findUnique({
      where: { sku },
      select: { id: true },
    })
    if (!existing) {
      const existingEquip = await prisma.equipment.findFirst({
        where: { sku, deletedAt: null },
        select: { id: true },
      })
      if (!existingEquip) return sku
    }
  }
  const ts = Date.now().toString(36).slice(-4).toUpperCase()
  return `${getCategoryPrefix(categoryName)}-${getBrandAbbr(brandName)}-${ts}`
}
