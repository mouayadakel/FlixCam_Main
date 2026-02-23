import XLSX from 'xlsx'
import { prisma } from '../src/lib/db/prisma'
import { EquipmentService } from '../src/lib/services/equipment.service'
import { createEquipmentSchema } from '../src/lib/validators/equipment.validator'

type SheetRow = Record<string, unknown>

type ImportStats = {
  sheets: number
  rowsTotal: number
  rowsNonEmpty: number
  toCreate: number
  skippedExistingSku: number
  skippedMissingBarcode: number
  skippedMissingName: number
  skippedDuplicateSkuInFile: number
  validationErrors: number
  created: number
  categoriesCreated: number
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

function toNumber(val: unknown): number | null {
  if (val == null) return null
  const s = String(val).trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function getFirstNonEmpty(...values: unknown[]) {
  for (const v of values) {
    if (v == null) continue
    const s = String(v).trim()
    if (s) return s
  }
  return ''
}

function normalizeHeaders(headers: unknown[]): string[] {
  return headers.map((h, idx) => {
    const raw = String(h ?? '').trim()
    return raw || `col_${idx + 1}`
  })
}

function rowToObject(headers: string[], row: unknown[]): SheetRow {
  const obj: SheetRow = {}
  for (let i = 0; i < headers.length; i++) {
    obj[headers[i]] = row[i]
  }
  return obj
}

function isRowEmpty(row: SheetRow): boolean {
  return Object.values(row).every((v) => String(v ?? '').trim() === '')
}

async function ensureCategoryBySheetName(sheetName: string, createdBy: string) {
  const name = sheetName.trim()
  const slug = slugify(name) || 'uncategorized'

  const existing = await prisma.category.findUnique({ where: { slug } })
  if (existing) return { id: existing.id, created: false }

  const created = await prisma.category.create({
    data: {
      name,
      slug,
      createdBy,
    },
    select: { id: true },
  })

  return { id: created.id, created: true }
}

async function resolveCategoryBySheetName(sheetName: string) {
  const name = sheetName.trim()
  const slug = slugify(name) || 'uncategorized'
  const existing = await prisma.category.findUnique({ where: { slug }, select: { id: true } })
  return existing ? existing.id : null
}

function buildSku(sheetName: string, barcode: string) {
  const sheetPart = slugify(sheetName)
  const barcodePart = String(barcode).trim()
  return `FLX-${sheetPart}-${barcodePart}`
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const commit = args.has('--commit')

  const filePath = 'docs/Flix Stock invintory  (1).xlsx'
  const createdBy = process.env.IMPORT_CREATED_BY ?? 'system'

  const stats: ImportStats = {
    sheets: 0,
    rowsTotal: 0,
    rowsNonEmpty: 0,
    toCreate: 0,
    skippedExistingSku: 0,
    skippedMissingBarcode: 0,
    skippedMissingName: 0,
    skippedDuplicateSkuInFile: 0,
    validationErrors: 0,
    created: 0,
    categoriesCreated: 0,
  }

  const wb = XLSX.readFile(filePath, { cellDates: true })
  stats.sheets = wb.SheetNames.length

  const usedSkusInFile = new Set<string>()

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as unknown[][]
    if (!rows.length) continue

    const headers = normalizeHeaders(rows[0] ?? [])
    const dataRows = rows.slice(1)

    // Create / resolve category for this sheet
    const categoryResult = commit
      ? await ensureCategoryBySheetName(sheetName, createdBy)
      : { id: await resolveCategoryBySheetName(sheetName), created: false }

    let categoryIdForRow: string | null = categoryResult.id
    if (!categoryIdForRow) {
      if (!commit) {
        // Dry-run: don't write categories, but still allow row validation/counting.
        stats.categoriesCreated++
        categoryIdForRow = `dryrun-${slugify(sheetName) || 'uncategorized'}`
      }
    }

    for (let i = 0; i < dataRows.length; i++) {
      const rowNumber = i + 2 // excel line number (1-based with header)
      stats.rowsTotal++

      const rowObj = rowToObject(headers, dataRows[i] ?? [])
      if (isRowEmpty(rowObj)) continue
      stats.rowsNonEmpty++

      const name = getFirstNonEmpty(rowObj['Name'], rowObj['name'], rowObj['*'])
      const barcode = getFirstNonEmpty(rowObj['Barcode'], rowObj['Barcod\ne'], rowObj['barcode'])
      const quantity =
        toNumber(rowObj['Quantity']) ??
        toNumber(rowObj['Quantity ']) ??
        toNumber(rowObj['Quantity On Hand']) ??
        1
      const witb = getFirstNonEmpty(rowObj['WITB'])
      const salesPrice = toNumber(rowObj['Sales Price'])

      if (!barcode) {
        stats.skippedMissingBarcode++
        continue
      }
      if (!name) {
        stats.skippedMissingName++
        continue
      }

      const sku = buildSku(sheetName, barcode)
      if (usedSkusInFile.has(sku)) {
        stats.skippedDuplicateSkuInFile++
        continue
      }
      usedSkusInFile.add(sku)

      const exists = await prisma.equipment.findFirst({
        where: { sku, deletedAt: null },
        select: { id: true },
      })
      if (exists) {
        stats.skippedExistingSku++
        continue
      }

      const payload = {
        sku,
        barcode,
        categoryId: categoryIdForRow,
        dailyPrice: Math.max(0, salesPrice ?? 0),
        quantityTotal: Math.max(1, Math.trunc(quantity)),
        quantityAvailable: Math.max(1, Math.trunc(quantity)),
        boxContents: witb || undefined,
        isActive: false,
        createdBy,
        translations: [
          {
            locale: 'en' as const,
            name,
          },
        ],
        customFields: {
          import: {
            source: 'flix_stock_xlsx',
            filePath,
            sheetName,
            excelRowNumber: rowNumber,
          },
        },
      }

      const parsed = createEquipmentSchema.safeParse(payload)
      if (!parsed.success) {
        stats.validationErrors++
        const flat = parsed.error.flatten().fieldErrors
        console.error(
          `[Import] Validation error sheet="${sheetName}" row=${rowNumber} sku=${sku}`,
          flat
        )
        continue
      }

      stats.toCreate++

      if (!commit) continue

      await EquipmentService.createEquipment({
        ...parsed.data,
        createdBy,
      })
      stats.created++
    }
  }

  console.log('\n=== Flix Stock Import Summary ===')
  console.log(`Mode: ${commit ? 'COMMIT (writes to DB)' : 'DRY RUN (no DB writes)'}`)
  console.log(`Sheets: ${stats.sheets}`)
  console.log(`Rows total scanned: ${stats.rowsTotal}`)
  console.log(`Rows non-empty: ${stats.rowsNonEmpty}`)
  console.log(`Categories auto-created: ${stats.categoriesCreated}`)
  console.log(`Would create: ${stats.toCreate}`)
  console.log(`Created: ${stats.created}`)
  console.log(`Skipped (missing barcode): ${stats.skippedMissingBarcode}`)
  console.log(`Skipped (missing name): ${stats.skippedMissingName}`)
  console.log(`Skipped (existing sku): ${stats.skippedExistingSku}`)
  console.log(`Skipped (duplicate sku in file): ${stats.skippedDuplicateSkuInFile}`)
  console.log(`Validation errors: ${stats.validationErrors}`)

  if (!commit) {
    console.log('\nTo actually import, run:')
    console.log('  tsx scripts/import-flix-stock-from-xlsx.ts --commit')
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error('[Import] Fatal error:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
