/**
 * @file process-pending-imports.ts
 * @description Manually process pending import jobs (useful when workers aren't running)
 */

import { prisma } from '../src/lib/db/prisma'
import { processImportJob } from '../src/lib/services/import-worker'

async function processPendingImports() {
  console.log('Finding pending import jobs...\n')

  const pendingJobs = await prisma.importJob.findMany({
    where: {
      status: 'PENDING',
    },
    orderBy: { createdAt: 'desc' },
  })

  if (pendingJobs.length === 0) {
    console.log('No pending import jobs found.')
    return
  }

  console.log(`Found ${pendingJobs.length} pending job(s).\n`)

  for (const job of pendingJobs) {
    console.log(`\n=== Processing Job: ${job.id} ===`)
    console.log(`Filename: ${job.filename}`)
    console.log(`Total Rows: ${job.totalRows}`)

    try {
      await processImportJob(job.id)
      console.log(`✓ Job ${job.id} processed successfully`)
    } catch (error: any) {
      console.error(`✗ Job ${job.id} failed:`, error.message)
      console.error(error.stack)
    }
  }

  console.log('\n✓ All jobs processed')
}

processPendingImports()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
