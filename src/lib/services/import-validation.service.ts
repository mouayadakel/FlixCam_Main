/**
 * @file import-validation.service.ts
 * @description Enhanced validation service for import data with dry-run mode,
 * duplicate detection, data type validation, price sanity checks, and photo gate.
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'

export type ValidationError = {
  rowNumber: number
  sheetName?: string
  excelRowNumber?: number
  field: string
  message: string
  severity: 'error' | 'warning'
}

export type ValidationResult = {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  summary: {
    totalRows: number
    validRows: number
    errorRows: number
    warningRows: number
    duplicateSkusInDb: string[]
    duplicateSkusInFile: string[]
    missingPhotos: number
    smartFillEligible: number
    smartFillBlocked: number
  }
}

const NAME_KEYS = ['Name', 'name', '*', 'Product Name', 'Product', 'اسم', 'item name', 'title']
const SKU_KEYS = ['SKU', 'sku', 'Barcode', 'barcode', 'Internal Reference', 'Product Code']
const PRICE_KEYS = [
  'Daily Price',
  'Price Daily',
  'daily_price',
  'Sales Price',
  'Price',
  'price',
  'السعر اليومي',
]
const IMAGE_KEYS = ['Featured Image', 'featured_image', 'featured', 'صورة', 'Image']
const GALLERY_KEYS = ['Gallery', 'gallery_images', 'Gallery Images', 'photos']

const MAX_PRICE = 99_999_999

function getField(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null) {
      const normalized = String(value).trim()
      if (normalized) return normalized
    }
  }
  return ''
}

function countImages(row: Record<string, unknown>): number {
  let count = 0
  const featured = getField(row, IMAGE_KEYS)
  if (featured && featured !== '/images/placeholder.jpg') count++
  const gallery = getField(row, GALLERY_KEYS)
  if (gallery) {
    const images = gallery.split(/[,\n]/).filter((s) => s.trim())
    count += images.length
  }
  return count
}

/**
 * Validate import rows with comprehensive checks.
 * When dryRun is true, also checks against existing database records.
 */
export async function validateImportRows(
  rows: Array<{
    rowNumber: number
    payload: { sheetName?: string; excelRowNumber?: number; row: Record<string, unknown> }
  }>,
  options?: { dryRun?: boolean; photoGateEnabled?: boolean }
): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const skusInFile: string[] = []
  const duplicateSkusInFile: string[] = []
  const errorRowNumbers = new Set<number>()
  let missingPhotos = 0

  for (const item of rows) {
    const row = item.payload?.row ?? {}
    const rn = item.rowNumber
    const sn = item.payload?.sheetName

    const name = getField(row, NAME_KEYS)
    if (!name) {
      errors.push({
        rowNumber: rn,
        sheetName: sn,
        field: 'Name',
        message: 'Name is required',
        severity: 'error',
      })
      errorRowNumbers.add(rn)
      continue
    }

    const sku = getField(row, SKU_KEYS)
    if (sku) {
      if (skusInFile.includes(sku)) {
        duplicateSkusInFile.push(sku)
      }
      skusInFile.push(sku)
    }

    const priceStr = getField(row, PRICE_KEYS)
    if (priceStr) {
      const price = Number(priceStr)
      if (!Number.isFinite(price)) {
        errors.push({
          rowNumber: rn,
          sheetName: sn,
          field: 'Price',
          message: `Invalid price value: "${priceStr}"`,
          severity: 'error',
        })
        errorRowNumbers.add(rn)
      } else if (price > 10_000_000 && Number.isInteger(price) && String(price).length >= 9) {
        const skuCol = getField(row, SKU_KEYS)
        const hint = skuCol
          ? `The SKU/Barcode column already has "${skuCol}". This value (${price}) looks like a barcode, not a price.`
          : `This value (${price}) looks like a barcode in the price column. Will be imported as DRAFT (price = 0).`
        warnings.push({
          rowNumber: rn,
          sheetName: sn,
          excelRowNumber: item.payload?.excelRowNumber,
          field: 'Price',
          message: hint,
          severity: 'warning',
        })
      } else if (price > MAX_PRICE) {
        errors.push({
          rowNumber: rn,
          sheetName: sn,
          field: 'Price',
          message: `Price ${price} exceeds maximum (${MAX_PRICE}).`,
          severity: 'error',
        })
        errorRowNumbers.add(rn)
      } else if (price < 0) {
        errors.push({
          rowNumber: rn,
          sheetName: sn,
          field: 'Price',
          message: `Negative price: ${price}`,
          severity: 'error',
        })
        errorRowNumbers.add(rn)
      } else if (price === 0) {
        warnings.push({
          rowNumber: rn,
          sheetName: sn,
          field: 'Price',
          message: 'Price is 0 — product will be saved as DRAFT',
          severity: 'warning',
        })
      }
    }

    if (options?.photoGateEnabled !== false) {
      const imageCount = countImages(row)
      if (imageCount < 4) {
        missingPhotos++
      }
    }
  }

  // Photo info: shown in summary amber box only (no duplicate in warnings list)

  let duplicateSkusInDb: string[] = []
  if (options?.dryRun && skusInFile.length > 0) {
    try {
      const existing = await prisma.product.findMany({
        where: { sku: { in: skusInFile }, deletedAt: null },
        select: { sku: true },
      })
      duplicateSkusInDb = existing.map((p) => p.sku!).filter(Boolean)

      for (const dup of duplicateSkusInDb) {
        const matchingRow = rows.find((r) => {
          const s = getField(r.payload?.row ?? {}, SKU_KEYS)
          return s === dup
        })
        if (matchingRow) {
          warnings.push({
            rowNumber: matchingRow.rowNumber,
            sheetName: matchingRow.payload?.sheetName,
            field: 'SKU',
            message: `SKU "${dup}" already exists in database`,
            severity: 'warning',
          })
        }
      }
    } catch {
      // DB not available for validation
    }
  }

  const validRows = rows.length - errorRowNumbers.size
  // All valid products are Smart Fill eligible; AI generates 4+ images when missing
  const smartFillEligible = rows.filter((r) => {
    const row = r.payload?.row ?? {}
    const name = getField(row, NAME_KEYS)
    return name && !errorRowNumbers.has(r.rowNumber)
  }).length

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRows: rows.length,
      validRows,
      errorRows: errorRowNumbers.size,
      warningRows: warnings.length,
      duplicateSkusInDb,
      duplicateSkusInFile: [...new Set(duplicateSkusInFile)],
      missingPhotos,
      smartFillEligible,
      smartFillBlocked: 0,
    },
  }
}
