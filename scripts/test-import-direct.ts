/**
 * Test import directly - bypasses browser/API for debugging.
 * Run: npx tsx scripts/test-import-direct.ts
 */
import { parseSpreadsheetBuffer } from '@/lib/utils/excel-parser'
import { ImportService } from '@/lib/services/import.service'
import { processImportJob } from '@/lib/services/import-worker'
import { getRowNameValue } from '@/lib/services/import-validation.service'
import { prisma } from '@/lib/db/prisma'
import * as fs from 'fs'
import * as path from 'path'

const TEMPLATE_PATH = path.join(process.cwd(), 'docs', 'templates', 'equipment-full-ai-filled.xlsx')
const MAX_ROWS_PER_SHEET = 20

async function main() {
  const resolvedPath = fs.existsSync(TEMPLATE_PATH)
    ? TEMPLATE_PATH
    : path.join(process.cwd(), 'docs', 'templates', 'equipment-full-ai-filled.xlsx')

  if (!fs.existsSync(resolvedPath)) {
    console.error('Excel file not found:', resolvedPath)
    process.exit(1)
  }

  const buffer = fs.readFileSync(resolvedPath)
  const filename = path.basename(resolvedPath)
  const wb = await parseSpreadsheetBuffer(buffer, filename)
  console.log('Sheets:', wb.sheetNames.join(', '))

  const admin = await prisma.user.findFirst({
    where: { deletedAt: null },
    select: { id: true },
  })
  if (!admin) {
    console.error('No user found for import')
    process.exit(1)
  }

  const job = await ImportService.createJob({
    filename,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    createdBy: admin.id,
  })

  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, parentId: true },
  })
  const cameraCat = categories.find((c) => /camera|cine|film|lens/i.test(c.name)) ?? categories[0]
  if (!cameraCat) {
    console.error('No category found')
    process.exit(1)
  }
  console.log('Using category:', cameraCat.name)

  const rowsToInsert: Array<{ rowNumber: number; payload: unknown }> = []
  let totalRows = 0

  for (const sheetName of wb.sheetNames) {
    const data = wb.getSheetData(sheetName) as Record<string, unknown>[]
    const slice = data.slice(0, MAX_ROWS_PER_SHEET)
    for (let index = 0; index < slice.length; index++) {
      const row = slice[index] ?? {}
      const name = getRowNameValue(row as Record<string, unknown>)
      if (!name) continue
      rowsToInsert.push({
        rowNumber: totalRows + 1,
        payload: {
          sheetName,
          categoryId: cameraCat.id,
          subCategoryId: null,
          excelRowNumber: index + 2,
          row,
        },
      })
      totalRows++
    }
  }

  if (rowsToInsert.length === 0) {
    console.error('No rows with a name found in file')
    process.exit(1)
  }

  await ImportService.appendRows(job.id, rowsToInsert)
  console.log(`Created job ${job.id} with ${rowsToInsert.length} rows`)

  await processImportJob(job.id)
  console.log('Import completed')

  const results = await prisma.importJobRow.findMany({
    where: { jobId: job.id },
    select: { rowNumber: true, status: true, productId: true },
  })
  const ok = results.filter((r) => r.status === 'SUCCESS')
  const failed = results.filter((r) => r.status === 'FAILED')
  console.log('Results:', ok.length, 'success', failed.length, 'failed')
  if (failed.length > 0) {
    console.log('Failed rows:', failed.map((r) => r.rowNumber))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
