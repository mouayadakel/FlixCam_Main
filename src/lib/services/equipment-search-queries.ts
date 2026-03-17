/**
 * @file equipment-search-queries.ts
 * @description Exact-match, category-aware search query generation for equipment photo sourcing.
 * Removes generic queries that produce wrong or lifestyle images.
 * @module lib/services
 */

export type ProductForQueries = {
  name: string
  sku: string | null
  category?: { name: string } | null
  brand?: { name: string } | null
}

type QueryTemplateContext = {
  brand: string
  model: string
  sku: string
}

/** Category-specific query templates for equipment types */
const CATEGORY_QUERY_TEMPLATES: Record<string, string[]> = {
  camera: [
    '"{sku}" "{model}" official product image',
    '"{sku}" "{model}" front view white background',
    '"{model}" body only front view',
    '"{model}" product shot white background',
    '"{brand} {model}" camera body',
    '"{model}" rear view product shot',
  ],
  lens: [
    '"{sku}" "{model}" official lens product image',
    '"{model}" lens side profile',
    '"{model}" lens mount product',
    '"{brand} {model}" lens product photo',
    '"{model}" front element product shot',
  ],
  light: [
    '"{sku}" "{model}" official product image',
    '"{model}" light head unit product',
    '"{model}" LED light product shot',
    '"{brand} {model}" lighting equipment',
    '"{model}" white background product shot',
  ],
  tripod: [
    '"{sku}" "{model}" official product image',
    '"{model}" tripod product',
    '"{model}" tripod head product shot',
    '"{brand} {model}" tripod',
    '"{model}" full height product shot',
  ],
  gimbal: [
    '"{sku}" "{model}" official product image',
    '"{model}" gimbal product',
    '"{model}" stabilizer product shot',
    '"{brand} {model}" gimbal',
    '"{model}" white background gimbal',
  ],
  audio: [
    '"{sku}" "{model}" official product image',
    '"{model}" microphone product',
    '"{model}" audio equipment product shot',
    '"{brand} {model}" audio',
    '"{model}" white background product shot',
  ],
  monitor: [
    '"{sku}" "{model}" official product image',
    '"{model}" monitor product',
    '"{model}" field monitor product shot',
    '"{brand} {model}" monitor',
    '"{model}" front view display off',
  ],
  accessory: [
    '"{sku}" "{model}" official product image',
    '"{sku}" "{model}" white background',
    '"{brand} {model}" product',
    '"{model}" white background product shot',
  ],
}

const RETAILER_DOMAINS = ['bhphotovideo.com', 'adorama.com', 'cvp.com', 'thomann.de']
const PRIORITY_RETAILER_DOMAINS = RETAILER_DOMAINS.slice(0, 2)

function normalizeCategory(cat: string | undefined | null): string {
  if (!cat) return 'accessory'
  const lower = cat.toLowerCase()
  if (lower.includes('camera') || lower.includes('body')) return 'camera'
  if (lower.includes('lens')) return 'lens'
  if (lower.includes('light') || lower.includes('led')) return 'light'
  if (lower.includes('tripod') || lower.includes('stand')) return 'tripod'
  if (lower.includes('gimbal') || lower.includes('stabil')) return 'gimbal'
  if (lower.includes('audio') || lower.includes('mic') || lower.includes('sound')) return 'audio'
  if (lower.includes('monitor') || lower.includes('display')) return 'monitor'
  return 'accessory'
}

function pushUnique(queries: string[], raw: string | null | undefined) {
  const query = raw?.trim()
  if (!query || query.length < 4) return
  if (!queries.includes(query)) queries.push(query)
}

function applyTemplate(template: string, ctx: QueryTemplateContext): string {
  return template
    .replace(/\{brand\}/g, ctx.brand)
    .replace(/\{model\}/g, ctx.model)
    .replace(/\{sku\}/g, ctx.sku || ctx.model)
    .replace(/\s+/g, ' ')
    .trim()
}

function buildRetailerSiteQueries(ctx: QueryTemplateContext, domains: readonly string[]): string[] {
  const queries: string[] = []

  for (const domain of domains) {
    if (ctx.sku) {
      pushUnique(queries, `"${ctx.sku}" site:${domain}`)
      if (ctx.model) pushUnique(queries, `"${ctx.sku}" "${ctx.model}" site:${domain}`)
      if (ctx.brand) pushUnique(queries, `"${ctx.sku}" ${ctx.brand} site:${domain}`.trim())
    }

    if (ctx.model) {
      pushUnique(queries, `"${ctx.model}" site:${domain}`)
      if (ctx.brand) pushUnique(queries, `"${ctx.brand} ${ctx.model}" site:${domain}`)
    }
  }

  return queries
}

function shouldPrioritizeRetailerQueries(categoryKey: string): boolean {
  return categoryKey !== 'camera' && categoryKey !== 'lens'
}

/**
 * Build exact-match search queries from brand, model, SKU, and category.
 * No generic "product photo" fallbacks for equipment.
 */
export function buildEquipmentSearchQueries(product: ProductForQueries): string[] {
  const brand = (product.brand?.name ?? '').trim()
  const model = (product.name ?? '').trim()
  const sku = (product.sku ?? '').trim()
  const category = product.category?.name ?? ''
  const catKey = normalizeCategory(category)
  const templates = CATEGORY_QUERY_TEMPLATES[catKey] ?? CATEGORY_QUERY_TEMPLATES.accessory

  const queries: string[] = []
  const ctx: QueryTemplateContext = { brand, model, sku }
  const priorityRetailerQueries = shouldPrioritizeRetailerQueries(catKey)
    ? buildRetailerSiteQueries(ctx, PRIORITY_RETAILER_DOMAINS)
    : []
  const allRetailerQueries = buildRetailerSiteQueries(ctx, RETAILER_DOMAINS)

  for (const query of priorityRetailerQueries) {
    pushUnique(queries, query)
  }

  if (sku) {
    pushUnique(queries, `"${sku}"`)
    pushUnique(queries, `"${sku}" official product image`)
    pushUnique(queries, `"${sku}" front view white background`)
    if (brand) pushUnique(queries, `"${sku}" ${brand}`.trim())
    if (model) pushUnique(queries, `"${sku}" "${model}"`)
    if (brand && model) pushUnique(queries, `"${sku}" "${brand} ${model}"`)
  }

  if (model) {
    pushUnique(queries, `"${model}" product photo`)
    pushUnique(queries, `"${model}" official product image`)
    pushUnique(queries, `"${model}" front view white background`)
    pushUnique(queries, `"${model}" rear view product shot`)
    pushUnique(queries, `${brand} ${model}`.trim())
    pushUnique(queries, `${brand} ${model} front view white background`.trim())
    pushUnique(queries, `${brand} ${model} ${category}`.trim())
    for (const t of templates) {
      pushUnique(queries, applyTemplate(t, ctx))
    }
  }
  if (brand && model) {
    pushUnique(queries, `"${brand} ${model}" official image`)
  }
  if (!queries.length && brand) {
    pushUnique(queries, `"${brand}" equipment product image`)
  }

  for (const query of allRetailerQueries) {
    pushUnique(queries, query)
  }

  return queries.slice(0, 12)
}
