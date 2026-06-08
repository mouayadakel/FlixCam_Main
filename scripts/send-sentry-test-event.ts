/**
 * Send a test event to Sentry to verify production DSN wiring.
 *
 * Usage: npx tsx scripts/send-sentry-test-event.ts
 */

import 'dotenv/config'
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

async function main() {
  if (!dsn?.trim()) {
    console.error(
      'SENTRY_DSN and NEXT_PUBLIC_SENTRY_DSN are empty in .env.\n' +
        'Create a project at https://sentry.io → Settings → Client Keys (DSN),\n' +
        'then set SENTRY_DSN and NEXT_PUBLIC_SENTRY_DSN and re-run: npm run sentry:test'
    )
    process.exit(1)
  }

  Sentry.init({
    dsn,
    environment: process.env.APP_ENV || process.env.NODE_ENV || 'production',
    tracesSampleRate: 0,
  })

  const eventId = Sentry.captureMessage('FlixCam pre-launch Sentry connectivity test', 'info')
  await Sentry.flush(5000)

  if (!eventId) {
    console.error('Sentry did not return an event id')
    process.exit(1)
  }

  console.log(`Sentry test event sent. eventId=${eventId}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
