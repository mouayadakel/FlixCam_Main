/**
 * @file start-import-worker.ts
 * @description Script to start the import worker process
 * Run with: tsx scripts/start-import-worker.ts
 */

import { getImportWorker } from '../src/lib/queue/import.worker'

console.log('🚀 Starting import worker...')
console.log('📋 Queue: product-import')
console.log('⚙️  Concurrency: 10')
console.log('')

const worker = getImportWorker()

console.log('✅ Import worker started successfully!')
console.log('⏸️  Press Ctrl+C to stop the worker')
console.log('')

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down worker...')
  await worker.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down worker...')
  await worker.close()
  process.exit(0)
})
