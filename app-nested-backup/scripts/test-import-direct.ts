/**
 * Test import directly - bypasses browser/API for debugging.
 * Run: npx tsx scripts/test-import-direct.ts
 */
import { parseSpreadsheetBuffer } from '@/lib/utils/excel-parser'
import { ImportService } from '@/lib/services/import.service'
import { processImportJob } from '@/lib/services/import-worker'
import { prisma } from '@/lib/db/prisma'
import * as fs from 'fs'
import * as path from 'path'

const EXCEL_PATH =
  path.join(process.cwd(), 'docs', 'Flix Stock invintory  (1).xlsx') ||
  '/Users/mohammedalakel/Desktop/WEBSITE/FlixCamFinal 3/docs/Flix Stock invintory  (1).xlsx'

async function main() {
  const resolvedPath = fs.existsSync(EXCEL_PATH)
    ? EXCEL_PATH
    : '/Users/mohammedalakel/Desktop/WEBSITE/FlixCamFinal 3/docs/Flix Stock invintory  (1).xlsx'

  if (!fs.existsSync(resolvedPath)) {
    console.error('Excel file not found:', resolvedPath)
    process.exit(1)
  }

  const buffer = fs.readFileSync(resolvedPath)
  const wb = await parseSpreadsheetBuffer(buffer, 'Flix Stock invintory (1).xlsx')

  const admin = await prisma.user.findFirst({
    where: { deletedAt: null },
    select: { id: true },
  })
  if (!admin) {
    console.error('No user found for import')
    process.exit(1)
  }

  const job = await ImportService.createJob({
    filename: 'Flix Stock invintory (1).xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    createdBy: admin.id,
  })

  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, parentId: true },
  })
  const cameraCat = categories.find((c) =>
    /camera|cine|film|lens/i.test(c.name)
  ) || categories[0]
  if (!cameraCat) {
    console.error('No category found')
    process.exit(1)
  }

  const rowsToInsert: Array<{ rowNumber: number; payload: unknown }> = []
  let totalRows = 0

  for (const sheetName of wb.sheetNames) {
    const data = wb.getSheetData(sheetName) as Record<string, unknown>[]
    data.slice(0, 50).forEach((row, index) => {
      const name = row['Name'] ?? row['name'] ?? row['*']
      if (!name || String(name).trim() === '') return
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
    })
  }

  await ImportService.appendRows(job.id, rowsToInsert)
  console.log(`Created job ${job.id} with ${rowsToInsert.length} rows`)

  await processImportJob(job.id)
  console.log('Import completed')

  const results = await prisma.importJobRow.findMany({
    where: { jobId: job.id },
    select: { rowNumber: true, status: true, productId: true },
  })
  console.log('Results:', results)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
