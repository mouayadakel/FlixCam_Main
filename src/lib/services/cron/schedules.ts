/**
 * Expected cron intervals for observability (missed-job detection).
 */

export interface CronScheduleMeta {
  slug: string
  label: string
  intervalMinutes: number
  tier: 1 | 2 | 3 | 4 | 5
}

export const CRON_JOB_SCHEDULES: CronScheduleMeta[] = [
  { slug: 'payment-retry', label: 'Payment retry', intervalMinutes: 1, tier: 1 },
  { slug: 'notification-queue', label: 'Notification queue', intervalMinutes: 1, tier: 1 },
  { slug: 'session-cleanup', label: 'Session cleanup', intervalMinutes: 1, tier: 1 },
  { slug: 'rental-status-updates', label: 'Rental status', intervalMinutes: 5, tier: 1 },
  { slug: 'inventory-sync', label: 'Inventory sync', intervalMinutes: 5, tier: 1 },
  { slug: 'redis-cleanup', label: 'Redis cleanup', intervalMinutes: 5, tier: 1 },
  { slug: 'moyasar-webhooks', label: 'Moyasar webhooks', intervalMinutes: 15, tier: 1 },
  { slug: 'health-check', label: 'Health check', intervalMinutes: 15, tier: 1 },
  { slug: 'late-return-detection', label: 'Late returns', intervalMinutes: 60, tier: 1 },
  { slug: 'auto-extend-offers', label: 'Auto-extend offers', intervalMinutes: 60, tier: 1 },
  { slug: 'payment-reconciliation', label: 'Payment reconciliation', intervalMinutes: 1440, tier: 2 },
  { slug: 'daily-revenue-report', label: 'Daily revenue', intervalMinutes: 1440, tier: 2 },
  { slug: 'email-digest', label: 'Email digest', intervalMinutes: 1440, tier: 2 },
  { slug: 'team-notifications', label: 'Team notifications', intervalMinutes: 1440, tier: 2 },
  { slug: 'wallet-settlements', label: 'Wallet settlements', intervalMinutes: 1440, tier: 2 },
  { slug: 'product-feeds', label: 'Product feeds', intervalMinutes: 1440, tier: 3 },
  { slug: 'sitemap-rebuild', label: 'Sitemap rebuild', intervalMinutes: 1440, tier: 3 },
  { slug: 'database-maintenance', label: 'DB maintenance', intervalMinutes: 10080, tier: 4 },
  { slug: 'pdpl-archive', label: 'PDPL archive', intervalMinutes: 10080, tier: 4 },
  { slug: 'security-scan', label: 'Security scan', intervalMinutes: 10080, tier: 4 },
  { slug: 'monthly-invoices', label: 'Monthly invoices', intervalMinutes: 43200, tier: 2 },
  { slug: 'credential-rotation-check', label: 'Credential rotation', intervalMinutes: 43200, tier: 4 },
  { slug: 'ga4-sync', label: 'GA4 sync', intervalMinutes: 1440, tier: 3 },
]
