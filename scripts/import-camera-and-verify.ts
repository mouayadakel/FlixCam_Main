/**
 * @file import-camera-and-verify.ts
 * @description Import Camera sheet from Excel, then verify edit page shows all data.
 * Run: npx tsx scripts/import-camera-and-verify.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { prisma } from '../src/lib/db/prisma'
import { ImportService } from '../src/lib/services/import.service'
import { processImportJob } from '../src/lib/services/import-worker'
import { parseSpreadsheetBuffer } from '../src/lib/utils/excel-parser'
import { ImportRowStatus } from '@prisma/client'
import { EquipmentService } from '../src/lib/services/equipment.service'
import { getRowNameValue } from '../src/lib/services/import-validation.service'

const EXCEL_PATH = path.join(
  process.env.HOME || '/Users/mohammedalakel',
  'Downloads',
  'equipment-full-ai-filled_last_import.xlsx'
)
const SHEET_NAME = 'Camera'

async function main() {
  console.log('=== Import Camera Sheet & Verify Edit Page ===\n')

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ File not found: ${EXCEL_PATH}`)
    process.exit(1)
  }

  const buffer = fs.readFileSync(EXCEL_PATH)
  const wb = await parseSpreadsheetBuffer(buffer, 'equipment-full-ai-filled_last_import.xlsx')

  if (!wb.sheetNames.includes(SHEET_NAME)) {
    console.error(`❌ Sheet "${SHEET_NAME}" not found. Available: ${wb.sheetNames.join(', ')}`)
    process.exit(1)
  }

  const cameraData = wb.getSheetData(SHEET_NAME) as Record<string, unknown>[]
  const headers = cameraData.length > 0 ? Object.keys(cameraData[0] || {}) : []
  console.log(`📋 Camera sheet: ${cameraData.length} rows, headers: ${headers.slice(0, 15).join(', ')}...`)

  const category = await prisma.category.findFirst({
    where: { name: { equals: 'Cameras', mode: 'insensitive' }, deletedAt: null },
    select: { id: true, name: true },
  })
  if (!category) {
    console.error('❌ Cameras category not found. Run db:seed first.')
    process.exit(1)
  }
  console.log(`📁 Category: ${category.name} (${category.id})`)

  const job = await ImportService.createJob({
    filename: 'equipment-full-ai-filled_last_import.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    createdBy: 'system',
  })

  const rowsWithName = cameraData.filter((row) => getRowNameValue(row as Record<string, unknown>))
  const rowsToInsert = rowsWithName.map((row, index) => ({
    rowNumber: index + 1,
    payload: {
      sheetName: SHEET_NAME,
      categoryId: category.id,
      excelRowNumber: cameraData.indexOf(row) + 2,
      row,
    },
  }))

  await ImportService.appendRows(job.id, rowsToInsert)

  await prisma.importJob.update({
    where: { id: job.id },
    data: { selectedSheets: [SHEET_NAME] },
  })

  console.log(`\n🔄 Processing import job ${job.id} (${rowsToInsert.length} rows)...`)
  await processImportJob(job.id, {})

  const successRows = await prisma.importJobRow.findMany({
    where: { jobId: job.id, status: ImportRowStatus.SUCCESS, productId: { not: null } },
    select: { productId: true, rowNumber: true },
    orderBy: { rowNumber: 'asc' },
  })

  if (successRows.length === 0) {
    const errors = await prisma.importJobRow.findMany({
      where: { jobId: job.id, status: ImportRowStatus.ERROR },
      select: { rowNumber: true, error: true },
    })
    console.error('❌ No rows imported successfully.')
    errors.slice(0, 5).forEach((e) => console.error(`  Row ${e.rowNumber}: ${e.error}`))
    process.exit(1)
  }

  const firstProductId = successRows[0].productId!
  const equipment = await prisma.equipment.findFirst({
    where: { productId: firstProductId, deletedAt: null },
    select: { id: true, sku: true, model: true },
  })

  if (!equipment) {
    console.error('❌ No equipment found for product', firstProductId)
    process.exit(1)
  }

  console.log(`\n✅ Imported ${successRows.length} rows. First equipment: ${equipment.sku} (${equipment.id})`)

  const fullEquipment = await EquipmentService.getEquipmentById(equipment.id)
  if (!fullEquipment) {
    console.error('❌ Could not fetch equipment via EquipmentService')
    process.exit(1)
  }

  const sampleExcelRow = (rowsWithName[0] || cameraData[0]) as Record<string, unknown>
  const trans = fullEquipment.translations || {}

  console.log('\n=== Verification: Excel vs Edit Page ===\n')

  const checks: { field: string; excel: string; edit: string; ok: boolean }[] = []

  const addCheck = (field: string, excelVal: unknown, editVal: unknown) => {
    const ex = String(excelVal ?? '').trim()
    const ed = String(editVal ?? '').trim()
    checks.push({ field, excel: ex.slice(0, 60), edit: ed.slice(0, 60), ok: ex === ed || (ex && ed.includes(ex)) || (!ex && !ed) })
  }

  addCheck('name_en', sampleExcelRow['name_en'] ?? sampleExcelRow['name'] ?? sampleExcelRow['model'], trans.en?.name)
  addCheck('name_ar', sampleExcelRow['name_ar'], trans.ar?.name)
  addCheck('name_zh', sampleExcelRow['name_zh'], trans.zh?.name)
  addCheck('shortDescription_en', sampleExcelRow['shortDescription_en'] ?? sampleExcelRow['short_description'], trans.en?.shortDescription)
  addCheck('shortDescription_ar', sampleExcelRow['shortDescription_ar'] ?? sampleExcelRow['short_desc_ar'], trans.ar?.shortDescription)
  addCheck('shortDescription_zh', sampleExcelRow['shortDescription_zh'] ?? sampleExcelRow['short_desc_zh'], trans.zh?.shortDescription)
  addCheck('longDescription_en', sampleExcelRow['longDescription_en'] ?? sampleExcelRow['long_description'], trans.en?.longDescription)
  addCheck('seoTitle_en', sampleExcelRow['seoTitle_en'] ?? sampleExcelRow['seo_title'], trans.en?.seoTitle)
  addCheck('seoTitle_ar', sampleExcelRow['seoTitle_ar'] ?? sampleExcelRow['seo_title_ar'], trans.ar?.seoTitle)
  addCheck('seoTitle_zh', sampleExcelRow['seoTitle_zh'] ?? sampleExcelRow['seo_title_zh'], trans.zh?.seoTitle)

  checks.forEach((c) => {
    const status = c.ok ? '✅' : '❌'
    console.log(`${status} ${c.field}`)
    console.log(`   Excel: ${c.excel || '(empty)'}`)
    console.log(`   Edit:  ${c.edit || '(empty)'}`)
  })

  const failed = checks.filter((c) => !c.ok)
  if (failed.length > 0) {
    console.log(`\n⚠️  ${failed.length} field(s) mismatch. Edit page: /admin/inventory/equipment/${equipment.id}/edit`)
    process.exit(1)
  }

  console.log('\n✅ All fields match. Edit page data verified.')
  console.log(`\n🔗 Edit URL: http://localhost:3000/admin/inventory/equipment/${equipment.id}/edit`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
