/**
 * Fuzzy match equipment names to catalog using Fuse.js.
 * Used for blog AI extract-equipment and admin equipment search.
 */

import Fuse from 'fuse.js'
import { prisma } from '@/lib/db/prisma'

export interface EquipmentSearchItem {
  id: string
  model: string | null
  sku: string | null
  brandName: string | null
  categoryName: string | null
  searchText: string
}

/**
 * Build searchable text for an equipment item.
 */
function buildSearchText(e: {
  model: string | null
  sku: string | null
  brand?: { name: string } | null
  category?: { name: string } | null
}): string {
  const parts = [
    e.model ?? '',
    e.sku ?? '',
    e.brand?.name ?? '',
    e.category?.name ?? '',
  ].filter(Boolean)
  return parts.join(' ').toLowerCase()
}

function safeStr(v: string | null | undefined): string {
  return v ?? ''
}

/**
 * Fetch equipment for fuzzy matching (lightweight list).
 */
export async function getEquipmentForFuzzyMatch(
  limit = 500
): Promise<EquipmentSearchItem[]> {
  const items = await prisma.equipment.findMany({
    where: { deletedAt: null, isActive: true },
    take: limit,
    select: {
      id: true,
      model: true,
      sku: true,
      brand: { select: { name: true } },
      category: { select: { name: true } },
    },
  })
  return items.map((e) => ({
    id: e.id,
    model: safeStr(e.model),
    sku: safeStr(e.sku),
    brandName: safeStr(e.brand?.name),
    categoryName: safeStr(e.category?.name),
    searchText: buildSearchText(e),
  }))
}

/**
 * Match extracted equipment names to catalog IDs using Fuse.js.
 * Returns equipment IDs sorted by match score (best first).
 */
export async function matchEquipmentNamesToIds(
  names: string[],
  threshold = 0.4
): Promise<Array<{ id: string; name: string; score: number }>> {
  if (names.length === 0) return []

  const catalog = await getEquipmentForFuzzyMatch()
  if (catalog.length === 0) return []

  const fuse = new Fuse(catalog, {
    keys: ['searchText', 'model', 'sku', 'brandName', 'categoryName'],
    threshold,
    includeScore: true,
  })

  const seen = new Set<string>()
  const results: Array<{ id: string; name: string; score: number }> = []

  for (const name of names) {
    const trimmed = name.trim()
    if (!trimmed) continue
    const matches = fuse.search(trimmed)
    const best = matches[0]
    if (best && best.item && !seen.has(best.item.id)) {
      seen.add(best.item.id)
      const score = best.score != null ? 1 - best.score : 1
      results.push({
        id: best.item.id,
        name: best.item.model ?? best.item.sku ?? best.item.id,
        score,
      })
    }
  }

  return results.sort((a, b) => b.score - a.score)
}
