/**
 * @file check-import-status.ts
 * @description Diagnostic script to check import job status and errors
 */

import { prisma } from '../src/lib/db/prisma'

async function checkImportStatus() {
  console.log('Checking import jobs...\n')

  // Get all import jobs
  const jobs = await prisma.importJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      rows: {
        where: {
          status: 'ERROR',
        },
        take: 20,
      },
    },
  })

  if (jobs.length === 0) {
    console.log('No import jobs found.')
    return
  }

  for (const job of jobs) {
    console.log(`\n=== Job ID: ${job.id} ===`)
    console.log(`Status: ${job.status}`)
    console.log(`Filename: ${job.filename}`)
    console.log(`Total Rows: ${job.totalRows}`)
    console.log(`Processed: ${job.processedRows}`)
    console.log(`Success: ${job.successRows}`)
    console.log(`Errors: ${job.errorRows}`)
    console.log(`Created: ${job.createdAt}`)
    console.log(`Updated: ${job.updatedAt}`)

    if (job.errorMessage) {
      console.log(`\nError Message: ${job.errorMessage}`)
    }

    if (job.rows.length > 0) {
      console.log(`\nSample Errors (${job.rows.length} shown):`)
      for (const row of job.rows) {
        console.log(`  Row ${row.rowNumber}: ${row.error || 'Unknown error'}`)
        if (row.payload) {
          const payload = row.payload as any
          console.log(`    Category ID: ${payload.categoryId || 'MISSING'}`)
          console.log(`    Sheet: ${payload.sheetName || 'N/A'}`)
        }
      }
    }

    // Check if rows exist but no products created
    const allRows = await prisma.importJobRow.findMany({
      where: { jobId: job.id },
    })

    const rowsWithCategory = allRows.filter((r) => {
      const payload = r.payload as any
      return payload?.categoryId
    })

    const rowsWithoutCategory = allRows.filter((r) => {
      const payload = r.payload as any
      return !payload?.categoryId
    })

    console.log(`\nRow Analysis:`)
    console.log(`  Total rows: ${allRows.length}`)
    console.log(`  Rows with category: ${rowsWithCategory.length}`)
    console.log(`  Rows without category: ${rowsWithoutCategory.length}`)
  }

  // Check if workers are processing
  console.log(`\n\n=== Checking Queue Status ===`)
  try {
    const { importQueue } = await import('../src/lib/queue/import.queue')
    const waiting = await importQueue.getWaiting()
    const active = await importQueue.getActive()
    const completed = await importQueue.getCompleted()
    const failed = await importQueue.getFailed()

    console.log(`Waiting jobs: ${waiting.length}`)
    console.log(`Active jobs: ${active.length}`)
    console.log(`Completed jobs: ${completed.length}`)
    console.log(`Failed jobs: ${failed.length}`)

    if (active.length > 0) {
      console.log(`\nActive job details:`)
      for (const job of active) {
        console.log(`  Job ID: ${job.id}, Progress: ${job.progress}%`)
      }
    }

    if (failed.length > 0) {
      console.log(`\nFailed job details:`)
      for (const job of failed) {
        console.log(`  Job ID: ${job.id}`)
        console.log(`  Error: ${job.failedReason}`)
      }
    }
  } catch (error: any) {
    console.log(`Error checking queue: ${error.message}`)
  }
}

checkImportStatus()
  .then(() => {
    console.log('\n✓ Check complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
