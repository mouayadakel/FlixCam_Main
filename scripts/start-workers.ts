/**
 * @file start-workers.ts
 * @description Script to start all background workers
 * @module scripts
 */

import { getImportWorker } from '@/lib/queue/import.worker'
import { getAIProcessingWorker } from '@/lib/queue/ai-processing.worker'
import { getImageProcessingWorker } from '@/lib/queue/image-processing.worker'
import { getBackfillWorker } from '@/lib/queue/backfill.worker'
import { backfillQueue } from '@/lib/queue/backfill.queue'

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

// Start backfill worker
const backfillWorker = getBackfillWorker()
console.log('✓ Backfill worker started')

// Nightly scan at 2:00 AM (queue products with gaps for backfill)
backfillQueue
  .add(
    'nightly-scan',
    {},
    { repeat: { cron: '0 2 * * *' }, removeOnComplete: 30, removeOnFail: 10 }
  )
  .then(() => console.log('✓ Nightly scan cron registered (2:00 AM)'))
  .catch((e) => console.warn('Nightly scan cron registration failed:', e))

// Nightly backfill at 2:00 AM (get product IDs with gaps and run AI backfill)
backfillQueue
  .add(
    'nightly-backfill',
    {},
    { repeat: { cron: '0 2 * * *' }, removeOnComplete: 30, removeOnFail: 10 }
  )
  .then(() => console.log('✓ Nightly backfill cron registered (2:00 AM)'))
  .catch((e) => console.warn('Nightly backfill cron registration failed:', e))

console.log('\nAll workers are running. Press Ctrl+C to stop.')

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down workers...')
  await importWorker.close()
  await aiWorker.close()
  await imageWorker.close()
  await backfillWorker.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\nShutting down workers...')
  await importWorker.close()
  await aiWorker.close()
  await imageWorker.close()
  await backfillWorker.close()
  process.exit(0)
})
