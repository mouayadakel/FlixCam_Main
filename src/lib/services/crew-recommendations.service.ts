/**
 * Crew catalog helpers: reverse links from gear to crew roles, kit-builder crew SKUs.
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

/** Suggested crew roles when questionnaire indicates a large crew (4+). */
export const LARGE_CREW_KIT_SKUS = ['CREW-1ST-AC', 'CREW-SOUND-MIX'] as const

const equipmentCardSelect = {
  id: true,
  sku: true,
  model: true,
  slug: true,
  dailyPrice: true,
  quantityAvailable: true,
  customFields: true,
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  media: {
    where: { deletedAt: null, type: 'image' as const },
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'asc' },
    ] satisfies Prisma.MediaOrderByWithRelationInput[],
    take: 1,
    select: { id: true, url: true, type: true },
  },
} satisfies Prisma.EquipmentSelect

type EquipmentCardRow = Prisma.EquipmentGetPayload<{ select: typeof equipmentCardSelect }>

export type CrewEquipmentCard = {
  id: string
  sku: string
  model: string | null
  slug: string | null
  dailyPrice: number
  quantityAvailable: number | null
  category: { id: string; name: string; slug: string | null } | null
  brand: { id: string; name: string; slug: string | null } | null
  media: { id: string; url: string; type: string }[]
}

function mapToCard(e: EquipmentCardRow): CrewEquipmentCard {
  return {
    id: e.id,
    sku: e.sku,
    model: e.model,
    slug: e.slug,
    dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
    quantityAvailable: e.quantityAvailable,
    category: e.category,
    brand: e.brand,
    media: e.media,
  }
}

function crewLinksToEquipment(
  customFields: unknown,
  equipmentId: string
): boolean {
  const ids = (customFields as Record<string, unknown> | null)?.relatedEquipmentIds
  return Array.isArray(ids) && ids.some((id) => id === equipmentId)
}

/**
 * Crew roles whose relatedEquipmentIds include this gear item.
 */
export async function getCrewRolesForEquipment(
  equipmentId: string
): Promise<CrewEquipmentCard[]> {
  const crewCategory = await prisma.category.findFirst({
    where: { slug: 'crew', deletedAt: null, parentId: null },
    select: { id: true },
  })
  if (!crewCategory) return []

  const candidates = await prisma.equipment.findMany({
    where: {
      categoryId: crewCategory.id,
      deletedAt: null,
      isActive: true,
    },
    select: equipmentCardSelect,
    orderBy: { dailyPrice: 'desc' },
  })

  return candidates
    .filter((e) => crewLinksToEquipment(e.customFields, equipmentId))
    .map(mapToCard)
}

/**
 * Load active crew equipment by SKU for kit suggestions.
 */
export async function getCrewEquipmentBySkus(
  skus: readonly string[],
  excludeEquipmentIds: Set<string> = new Set()
): Promise<CrewEquipmentCard[]> {
  if (skus.length === 0) return []

  const rows = await prisma.equipment.findMany({
    where: {
      sku: { in: [...skus] },
      deletedAt: null,
      isActive: true,
      quantityAvailable: { gt: 0 },
      id: { notIn: [...excludeEquipmentIds] },
    },
    select: equipmentCardSelect,
  })

  const bySku = new Map(rows.map((r) => [r.sku, r]))
  return skus
    .map((sku) => bySku.get(sku))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map(mapToCard)
}
