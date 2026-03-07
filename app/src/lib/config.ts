/**
 * @file config.ts
 * @description Application configuration
 * @module lib/config
 */

export const config = {
  app: {
    name: process.env.APP_NAME || 'FlixCam.rent',
    url: process.env.APP_URL || 'http://localhost:3000',
    env: process.env.APP_ENV || 'development',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET || '',
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
  payments: {
    tap: {
      secretKey: process.env.TAP_SECRET_KEY || '',
      publicKey: process.env.TAP_PUBLIC_KEY || '',
      webhookSecret: process.env.TAP_WEBHOOK_SECRET || '',
    },
  },
  rateLimit: {
    api: {
      requestsPerHour: parseInt(process.env.RATE_LIMIT_API_REQUESTS_PER_HOUR || '100', 10),
    },
    auth: {
      attemptsPer15Min: parseInt(process.env.RATE_LIMIT_AUTH_ATTEMPTS_PER_15MIN || '10', 10),
    },
    // Phase 0.2: Plan limits (per minute unless noted)
    public: { requestsPerMinute: 100 },
    authenticated: { requestsPerMinute: 300 },
    checkout: { requestsPerMinute: 10 },
    payment: { requestsPer5Min: 5 },
  },
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  },
} as const
