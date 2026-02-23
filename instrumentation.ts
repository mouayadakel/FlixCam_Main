/**
 * Next.js instrumentation – runs once when the server starts.
 * Starts the import queue worker in-process so admins don't need to run
 * a separate "npm run worker:import". Jobs queued by the API are processed
 * automatically. If Redis is unavailable, the API falls back to processing
 * imports synchronously in the request.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  try {
    const { getImportWorker } = await import('@/lib/queue/import.worker')
    getImportWorker()
    console.log('[Instrumentation] Import queue worker started (jobs will process automatically).')
  } catch (err) {
    // Redis/queue unavailable – imports will still work via sync fallback in the API
    console.warn(
      '[Instrumentation] Import worker not started (Redis may be unavailable). Imports will run in the request when the queue is unavailable.'
    )
  }

  try {
    const { getBackfillWorker } = await import('@/lib/queue/backfill.worker')
    getBackfillWorker()
    console.log(
      '[Instrumentation] Backfill queue worker started (AI fill jobs will process automatically).'
    )
  } catch (err) {
    console.warn(
      '[Instrumentation] Backfill worker not started (Redis may be unavailable). AI fill jobs will remain queued until a worker is available.'
    )
  }
}
