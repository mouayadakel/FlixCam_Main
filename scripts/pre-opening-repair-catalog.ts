/**
 * Repair common pre-opening catalog gaps: missing description, barcode, inventory, price.
 *
 * Usage:
 *   npx tsx scripts/pre-opening-repair-catalog.ts           # dry-run
 *   npx tsx scripts/pre-opening-repair-catalog.ts --commit    # apply
 */

import * as fs from 'fs'
import { prisma } from '../src/lib/db/prisma'
import { parseSpreadsheetBuffer } from '../src/lib/utils/excel-parser'
import { InventoryItemStatus } from '@prisma/client'

const COMMIT = process.argv.includes('--commit')
const XLSX_PATH =
  process.argv.find((a) => a.startsWith('--file='))?.slice('--file='.length) ??
  'Flixcam_invetory.all-equipment.full-data.xlsx'

type PriceRow = { sku: string; dailyPrice: number }

function toNumber(val: unknown): number | null {
  if (val == null) return null
  const n = Number(String(val).replace(/,/g, '').trim())
  return Number.isFinite(n) && n > 0 ? n : null
}

function getFirstNonEmpty(...values: unknown[]) {
  for (const v of values) {
    if (v == null) continue
    const s = String(v).trim()
    if (s) return s
  }
  return ''
}

async function loadPricesFromXlsx(): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (!fs.existsSync(XLSX_PATH)) {
    console.warn(`[repair] XLSX not found: ${XLSX_PATH}`)
    return map
  }

  const buffer = fs.readFileSync(XLSX_PATH)
  const wb = await parseSpreadsheetBuffer(buffer, XLSX_PATH)

  for (const sheetName of wb.sheetNames) {
    const data = wb.getSheetData(sheetName)
    if (!data.length) continue
    for (const row of data) {
      const sku = getFirstNonEmpty(row.sku, row.SKU, row.Sku)
      const price = toNumber(
        row.dailyPrice ?? row['Daily Price'] ?? row.price ?? row['Sales Price'] ?? row.salesPrice
      )
      if (sku && price) map.set(sku, price)
    }
  }

  return map
}

function barcodeFromSku(sku: string): string {
  return `BC-${sku.replace(/[^A-Z0-9]/gi, '').slice(0, 20)}`
}

async function main() {
  const priceMap = await loadPricesFromXlsx()
  const equipment = await prisma.equipment.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      sku: true,
      model: true,
      dailyPrice: true,
      descriptionEn: true,
      barcode: true,
      productId: true,
      product: {
        select: {
          inventoryItems: {
            where: { deletedAt: null },
            select: { id: true },
          },
        },
      },
    },
  })

  let descFixed = 0
  let priceFixed = 0
  let barcodeFixed = 0
  let inventoryCreated = 0

  for (const item of equipment) {
    const updates: Record<string, unknown> = {}

    if (!item.descriptionEn?.trim() && item.model?.trim()) {
      updates.descriptionEn = item.model.trim()
      descFixed++
    }

    if (!item.dailyPrice || Number(item.dailyPrice) <= 0) {
      const fromXlsx = priceMap.get(item.sku)
      if (fromXlsx) {
        updates.dailyPrice = fromXlsx
        priceFixed++
      } else {
        const model = (item.model ?? '').toLowerCase()
        const fallback =
          model.includes('alexa') ? 2000 : model.includes('mavic') || model.includes('drone') ? 350 : null
        if (fallback) {
          updates.dailyPrice = fallback
          priceFixed++
        }
      }
    }

    let barcode = item.barcode?.trim() ?? ''
    if (!barcode) {
      barcode = barcodeFromSku(item.sku)
      updates.barcode = barcode
      barcodeFixed++
    }

    const needsInventory =
      item.productId &&
      (item.product?.inventoryItems.length ?? 0) === 0 &&
      barcode.length > 0

    if (COMMIT && Object.keys(updates).length > 0) {
      await prisma.equipment.update({
        where: { id: item.id },
        data: updates,
      })
    }

    if (needsInventory) {
      inventoryCreated++
      if (COMMIT && item.productId) {
        await prisma.inventoryItem.create({
          data: {
            parentProductId: item.productId,
            serialNumber: barcode,
            barcode,
            itemStatus: InventoryItemStatus.AVAILABLE,
            createdBy: 'pre-opening-repair-catalog',
          },
        })
      }
    }
  }

  console.log(`Mode: ${COMMIT ? 'COMMIT' : 'DRY RUN'}`)
  console.log(`XLSX price lookup: ${priceMap.size} SKUs from ${XLSX_PATH}`)
  console.log(`Would fix descriptions: ${descFixed}`)
  console.log(`Would fix prices: ${priceFixed}`)
  console.log(`Would set barcodes: ${barcodeFixed}`)
  console.log(`Would create inventory items: ${inventoryCreated}`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
