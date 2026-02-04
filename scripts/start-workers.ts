/**
 * @file start-workers.ts
 * @description Script to start all background workers
 * @module scripts
 */

import { getImportWorker } from '@/lib/queue/import.worker'
import { getAIProcessingWorker } from '@/lib/queue/ai-processing.worker'
import { getImageProcessingWorker } from '@/lib/queue/image-processing.worker'

console.log('Starting background workers...')

// Start import worker
const importWorker = getImportWorker()
console.log('✓ Import worker started')

// Start AI processing worker
const aiWorker = getAIProcessingWorker()
console.log('✓ AI processing worker started')

// Start image processing worker
const imageWorker = getImageProcessingWorker()
console.log('✓ Image processing worker started')

console.log('\nAll workers are running. Press Ctrl+C to stop.')

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down workers...')
  await importWorker.close()
  await aiWorker.close()
  await imageWorker.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\nShutting down workers...')
  await importWorker.close()
  await aiWorker.close()
  await imageWorker.close()
  process.exit(0)
})
