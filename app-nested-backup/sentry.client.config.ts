/**
 * Sentry client config (Phase 0.4). Only initializes when NEXT_PUBLIC_SENTRY_DSN is set.
 */

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    beforeSend(event) {
      if (event.request) {
        const req = event.request as Record<string, unknown>
        delete req.cookies
        if (req.headers && typeof req.headers === 'object') {
          const headers = req.headers as Record<string, unknown>
          delete headers.authorization
          delete headers.cookie
        }
      }
      return event
    },
  })
}
