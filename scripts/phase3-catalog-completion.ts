/**
 * Phase 3: Export photo checklist, data accuracy audit, pending image cleanup,
 * Excel photo template, and completion report.
 *
 * Run: npx tsx scripts/phase3-catalog-completion.ts
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import { prisma } from '../src/lib/db/prisma'
import {
  promoteApprovedPhotosToProduct,
  isPlaceholderUrl,
} from '../src/lib/services/product-photo.service'
import { syncProductToEquipment } from '../src/lib/services/product-equipment-sync.service'

const OUT_DIR = path.join(process.cwd(), 'docs', 'exports')
const CSV_MASTER = path.join(process.cwd(), 'docs', 'templates', 'equipment-full-ai-filled.csv')

const LOW_TRUST = ['pexels.com', 'unsplash.com', 'gstatic.com', 'media-amazon.com']

function trustScore(url: string): number {
  if (url.includes('/uploads/')) return 100
  try {
    const host = new URL(url.startsWith('http') ? url : `https://flixcam.rent${url}`).hostname
    if (LOW_TRUST.some((d) => host.includes(d))) return 10
  } catch {
    return 0
  }
  return 55
}

function norm(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

type CsvRow = Record<string, string>

function loadMasterCsv(): Map<string, CsvRow> {
  const json = execSync(
    `python3 -c "import csv,json; rows=list(csv.DictReader(open('${CSV_MASTER}',encoding='utf-8'))); print(json.dumps(rows))"`,
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
  )
  const rows = JSON.parse(json) as CsvRow[]
  const map = new Map<string, CsvRow>()
  for (const row of rows) {
    const sku = row.sku?.trim()
    if (sku) map.set(sku, row)
  }
  return map
}

async function exportPhotoChecklist(): Promise<number> {
  const items = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      media: {
        some: {
          deletedAt: null,
          type: 'image',
          sortOrder: 0,
          OR: [
            { url: { contains: 'pexels' } },
            { url: { contains: 'unsplash' } },
            { url: { contains: 'gstatic' } },
          ],
        },
      },
      NOT: {
        media: { some: { deletedAt: null, type: 'image', url: { contains: '/uploads/' } } },
      },
    },
    select: {
      id: true,
      sku: true,
      model: true,
      slug: true,
      category: { select: { name: true, slug: true } },
      brand: { select: { name: true } },
      media: {
        where: { deletedAt: null, type: 'image' },
        orderBy: [{ sortOrder: 'asc' }],
        take: 1,
        select: { url: true },
      },
    },
    orderBy: { sku: 'asc' },
  })

  const lines = [
    'sku,model,category,brand,current_primary_url,admin_equipment_url,featuredImageUrl_to_fill,galleryImageUrls_to_fill,status',
  ]
  for (const e of items) {
    const primary = e.media[0]?.url ?? ''
    const adminUrl = `/admin/inventory/equipment/${e.id}`
    lines.push(
      [
        e.sku,
        `"${(e.model ?? '').replace(/"/g, '""')}"`,
        e.category?.name ?? '',
        e.brand?.name ?? '',
        `"${primary.replace(/"/g, '""')}"`,
        adminUrl,
        '',
        '',
        'NEEDS_REAL_PHOTO',
      ].join(',')
    )
  }

  const out = path.join(OUT_DIR, 'PHOTO_UPLOAD_CHECKLIST.csv')
  fs.writeFileSync(out, lines.join('\n'), 'utf8')
  return items.length
}

async function exportPhotoExcelTemplate(): Promise<number> {
  const active = await prisma.equipment.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      sku: true,
      model: true,
      category: { select: { slug: true } },
      brand: { select: { name: true } },
      dailyPrice: true,
      media: {
        where: { deletedAt: null, type: 'image' },
        orderBy: [{ sortOrder: 'asc' }],
        take: 1,
        select: { url: true },
      },
    },
    orderBy: { sku: 'asc' },
  })

  const header =
    'sku,model,category_slug,brand_slug,dailyPrice,current_primary_url,featuredImageUrl,galleryImageUrls,upload_status'
  const lines = [header]
  for (const e of active) {
    const primary = e.media[0]?.url ?? ''
    const needsFill = trustScore(primary) <= 10 ? 'REPLACE_STOCK' : primary.includes('/uploads/') ? 'OK_UPLOAD' : 'VERIFY'
    lines.push(
      [
        e.sku,
        `"${(e.model ?? '').replace(/"/g, '""')}"`,
        e.category?.slug ?? '',
        e.brand?.name ?? '',
        e.dailyPrice ? Number(e.dailyPrice) : '',
        `"${primary.replace(/"/g, '""')}"`,
        '',
        '',
        needsFill,
      ].join(',')
    )
  }

  const out = path.join(OUT_DIR, 'EQUIPMENT_PHOTO_URLS_TEMPLATE.csv')
  fs.writeFileSync(out, lines.join('\n'), 'utf8')
  return active.length
}

type AuditIssue = { sku: string; field: string; expected: string; actual: string }

async function runDataAccuracyAudit(master: Map<string, CsvRow>): Promise<{
  issues: AuditIssue[]
  matched: number
  missingInDb: string[]
  missingInCsv: number
}> {
  const equipment = await prisma.equipment.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      sku: true,
      model: true,
      nameEn: true,
      dailyPrice: true,
      quantityTotal: true,
      customFields: true,
      category: { select: { slug: true } },
      brand: { select: { name: true } },
      product: {
        select: {
          boxContents: true,
          translations: {
            where: { locale: 'en', deletedAt: null },
            take: 1,
            select: { name: true, shortDescription: true, longDescription: true },
          },
        },
      },
    },
  })

  const issues: AuditIssue[] = []
  const missingInDb: string[] = []
  let matched = 0
  const dbSkus = new Set(equipment.map((e) => e.sku))

  for (const [sku, row] of master) {
    if (!dbSkus.has(sku)) missingInDb.push(sku)
  }

  for (const eq of equipment) {
    const row = master.get(eq.sku)
    if (!row) continue
    matched++

    const csvName = norm(row.name_en || row.model)
    const dbName = norm(eq.product?.translations[0]?.name || eq.nameEn || eq.model)
    if (csvName && dbName && csvName !== dbName && !dbName.includes(csvName) && !csvName.includes(dbName)) {
      issues.push({ sku: eq.sku, field: 'name_en', expected: row.name_en || row.model, actual: eq.product?.translations[0]?.name || eq.nameEn || '' })
    }

    const csvPrice = num(row.dailyPrice)
    const dbPrice = eq.dailyPrice ? Number(eq.dailyPrice) : null
    if (csvPrice != null && dbPrice != null && Math.abs(csvPrice - dbPrice) > 0.01) {
      issues.push({ sku: eq.sku, field: 'dailyPrice', expected: String(csvPrice), actual: String(dbPrice) })
    }

    const csvQty = num(row.quantityTotal)
    const dbQty = eq.quantityTotal
    if (csvQty != null && dbQty != null && csvQty !== dbQty) {
      issues.push({ sku: eq.sku, field: 'quantityTotal', expected: String(csvQty), actual: String(dbQty) })
    }

    const csvCat = norm(row.category_slug)
    const dbCat = norm(eq.category?.slug)
    if (csvCat && dbCat && csvCat !== dbCat) {
      issues.push({ sku: eq.sku, field: 'category_slug', expected: row.category_slug, actual: eq.category?.slug ?? '' })
    }

    const csvBox = norm(row.boxContents)
    const custom = eq.customFields as Record<string, unknown> | null
    const dbBox = norm((custom?.boxContents as string) ?? eq.product?.boxContents ?? '')
    if (csvBox && dbBox && csvBox.length > 20 && dbBox.length > 20 && csvBox.slice(0, 40) !== dbBox.slice(0, 40)) {
      issues.push({ sku: eq.sku, field: 'boxContents', expected: row.boxContents.slice(0, 80), actual: String(custom?.boxContents ?? '').slice(0, 80) })
    }
  }

  const missingInCsv = equipment.filter((e) => !master.has(e.sku)).length

  const issueLines = ['sku,field,expected,actual', ...issues.map((i) =>
    [i.sku, i.field, `"${i.expected.replace(/"/g, '""')}"`, `"${i.actual.replace(/"/g, '""')}"`].join(',')
  )]
  fs.writeFileSync(path.join(OUT_DIR, 'DATA_ACCURACY_ISSUES.csv'), issueLines.join('\n'), 'utf8')

  return { issues, matched, missingInDb, missingInCsv }
}

async function processRemainingPending(): Promise<{ approved: number; rejected: number }> {
  const pending = await prisma.productImage.findMany({
    where: { isDeleted: false, pendingReview: true },
    orderBy: [{ matchScore: 'desc' }, { qualityScore: 'desc' }],
  })

  const byProduct = new Map<string, typeof pending>()
  for (const img of pending) {
    const list = byProduct.get(img.productId) ?? []
    list.push(img)
    byProduct.set(img.productId, list)
  }

  let approved = 0
  let rejected = 0
  const affected = new Set<string>()

  for (const [productId, images] of byProduct) {
    const toApprove: string[] = []
    const toReject: string[] = []

    for (const img of images) {
      const breakdown = img.scoreBreakdown as Record<string, unknown> | null
      const exact = breakdown?.exactSkuQuery === true || breakdown?.exactModelQuery === true
      const score = img.matchScore != null ? Number(img.matchScore) : 0
      const lowStock =
        img.url.includes('unsplash') || img.url.includes('pexels') || img.imageSource === 'STOCK_PHOTO'

      if (exact && score >= 0.7) {
        toApprove.push(img.id)
      } else if (lowStock && score < 0.45) {
        toReject.push(img.id)
      } else if (score >= 0.65 && trustScore(img.url) >= 50) {
        toApprove.push(img.id)
      } else if (lowStock) {
        toReject.push(img.id)
      } else if (score >= 0.55) {
        toApprove.push(img.id)
      }
    }

    // At least one hero if product still placeholder
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { featuredImage: true },
    })
    const heroBad = !product?.featuredImage || isPlaceholderUrl(product.featuredImage) || trustScore(product.featuredImage) <= 10
    if (heroBad && toApprove.length === 0 && images.length > 0) {
      const best = images.filter((i) => !toReject.includes(i.id)).slice(0, 1)
      for (const b of best) toApprove.push(b.id)
    }

    if (!toApprove.length && !toReject.length) continue
    affected.add(productId)

    for (let i = 0; i < toApprove.slice(0, 3).length; i++) {
      await prisma.productImage.update({
        where: { id: toApprove[i] },
        data: {
          pendingReview: false,
          isPrimary: i === 0,
          sortOrder: i,
          reviewedAt: new Date(),
          reviewedBy: 'phase3-auto',
        },
      })
      approved++
    }
    for (const id of toReject) {
      await prisma.productImage.update({
        where: { id },
        data: {
          pendingReview: false,
          isDeleted: true,
          rejectionReason: 'phase3_auto_reject',
          reviewedAt: new Date(),
          reviewedBy: 'phase3-auto',
        },
      })
      rejected++
    }
  }

  for (const productId of affected) {
    await promoteApprovedPhotosToProduct(productId)
    await syncProductToEquipment(productId)
  }

  return { approved, rejected }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  console.log('=== Phase 3: Catalog completion ===\n')

  const checklistCount = await exportPhotoChecklist()
  console.log(`✓ Photo checklist: ${checklistCount} SKUs → docs/exports/PHOTO_UPLOAD_CHECKLIST.csv`)

  const templateCount = await exportPhotoExcelTemplate()
  console.log(`✓ Photo URL template: ${templateCount} rows → docs/exports/EQUIPMENT_PHOTO_URLS_TEMPLATE.csv`)

  const master = loadMasterCsv()
  const audit = await runDataAccuracyAudit(master)
  console.log(`✓ Data audit: ${audit.matched} matched, ${audit.issues.length} issues → docs/exports/DATA_ACCURACY_ISSUES.csv`)
  console.log(`  CSV rows not in DB: ${audit.missingInDb.length}, DB active not in CSV: ${audit.missingInCsv}`)

  console.log('\nProcessing pending images...')
  const pending = await processRemainingPending()
  console.log(`✓ Pending: ${pending.approved} approved, ${pending.rejected} rejected`)

  const stillPending = await prisma.productImage.count({ where: { isDeleted: false, pendingReview: true } })
  const stockPrimary = await prisma.equipment.count({
    where: {
      deletedAt: null,
      isActive: true,
      media: {
        some: {
          deletedAt: null,
          type: 'image',
          sortOrder: 0,
          OR: [{ url: { contains: 'pexels' } }, { url: { contains: 'unsplash' } }],
        },
      },
      NOT: { media: { some: { deletedAt: null, type: 'image', url: { contains: '/uploads/' } } } },
    },
  })

  const report = `# Phase 3 completion report

Generated: ${new Date().toISOString()}

## Deliverables

| File | Purpose |
|------|---------|
| \`docs/exports/PHOTO_UPLOAD_CHECKLIST.csv\` | **${checklistCount} SKUs** that need real photos uploaded in admin |
| \`docs/exports/EQUIPMENT_PHOTO_URLS_TEMPLATE.csv\` | Full catalog template — fill \`featuredImageUrl\` / \`galleryImageUrls\` before re-import |
| \`docs/exports/DATA_ACCURACY_ISSUES.csv\` | **${audit.issues.length}** field mismatches vs master CSV |

## Data accuracy summary

- Equipment matched to CSV by SKU: **${audit.matched}**
- Field mismatches found: **${audit.issues.length}**
- SKUs in CSV but not in DB: **${audit.missingInDb.length}**
- Active equipment not in CSV: **${audit.missingInCsv}**

### Top issue types
${Object.entries(
  audit.issues.reduce<Record<string, number>>((acc, i) => {
    acc[i.field] = (acc[i.field] ?? 0) + 1
    return acc
  }, {})
)
  .sort((a, b) => b[1] - a[1])
  .map(([f, c]) => `- **${f}**: ${c}`)
  .join('\n')}

## Photo queue

- Pending images after cleanup: **${stillPending}**
- SKUs still on stock primary (need manual upload): **${stockPrimary}**

## Your team's workflow

1. Open \`PHOTO_UPLOAD_CHECKLIST.csv\` — upload photos per SKU in admin (column \`admin_equipment_url\`).
2. Or fill \`EQUIPMENT_PHOTO_URLS_TEMPLATE.csv\` with direct image URLs and re-import.
3. Review \`DATA_ACCURACY_ISSUES.csv\` — fix wrong prices/names/categories in admin.

## Enable Google Custom Search (better auto-photos)

Your API key returns \`403 PERMISSION_DENIED\` for Custom Search. To fix:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Library**
2. Enable **Custom Search API**
3. Confirm \`GOOGLE_CUSTOM_SEARCH_API_KEY\` and \`GOOGLE_SEARCH_ENGINE_ID\` in \`.env\`
4. Re-run: \`npx tsx scripts/backfill-missing-equipment-photos.ts\`

## Re-run scripts

\`\`\`bash
npx tsx scripts/phase3-catalog-completion.ts
npx tsx scripts/repair-catalog-photos.ts --commit
\`\`\`
`

  fs.writeFileSync(path.join(process.cwd(), 'docs', 'PHASE3_COMPLETION_REPORT.md'), report, 'utf8')
  console.log(`\n✓ Report: docs/PHASE3_COMPLETION_REPORT.md`)
  console.log(`\nRemaining: ${stockPrimary} SKUs need manual real photos, ${stillPending} pending review`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
