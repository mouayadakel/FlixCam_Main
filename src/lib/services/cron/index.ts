/**
 * Cron job registry — maps job slugs to handlers.
 */

import type { CronJobResult } from './cron-utils'
import {
  runPaymentRetry,
  runMonthlyInvoices,
  runWalletSettlements,
  runPaymentReconciliation,
} from './payment-cron.service'
import {
  runRentalStatusUpdates,
  runLateReturnDetection,
  runAutoExtendOffers,
  runInventorySync,
} from './rental-cron.service'
import {
  runSmsOtpCleanup,
  runNotificationQueue,
  runEmailDigest,
  runOrderNotifications,
  runSessionCleanup,
} from './notification-cron.service'
import {
  runRedisCleanup,
  runDatabaseMaintenance,
  runHealthCheck,
} from './maintenance-cron.service'
import {
  runDailyRevenueReport,
  runEquipmentUtilizationReport,
  runUserActivitySummary,
  runGa4Sync,
} from './analytics-cron.service'
import {
  runSitemapRebuild,
  runSchemaRefresh,
  runProductFeeds,
} from './content-cron.service'
import {
  runPdplArchive,
  runPdplRestoreDrill,
  runCredentialRotationCheck,
  runSecurityScan,
} from './compliance-cron.service'
import {
  runTeamNotifications,
  runEquipmentSpecsValidation,
  runTicketEscalation,
  runSeasonalPromos,
} from './admin-cron.service'
import {
  runCronHealthAlerts,
  runDeadLetterReview,
  runInfrastructureHealth,
} from './observability-cron.service'
import {
  runFeedValidation,
  runWaitlistAvailability,
  runReviewRequests,
  runLowStockAlerts,
  runAbandonedCartTiered,
} from './growth-cron.service'
import {
  runZatcaInvoiceSync,
  runAutoRefundCancelled,
  runVendorStatements,
  runInvoiceDunning,
} from './finance-cron.service'

export type CronJobHandler = () => Promise<CronJobResult>

export const CRON_JOB_REGISTRY: Record<string, CronJobHandler> = {
  'payment-retry': runPaymentRetry,
  'monthly-invoices': runMonthlyInvoices,
  'wallet-settlements': runWalletSettlements,
  'payment-reconciliation': runPaymentReconciliation,
  'rental-status-updates': runRentalStatusUpdates,
  'late-return-detection': runLateReturnDetection,
  'auto-extend-offers': runAutoExtendOffers,
  'inventory-sync': runInventorySync,
  'sms-otp-cleanup': runSmsOtpCleanup,
  'notification-queue': runNotificationQueue,
  'email-digest': runEmailDigest,
  'order-notifications': runOrderNotifications,
  'session-cleanup': runSessionCleanup,
  'redis-cleanup': runRedisCleanup,
  'database-maintenance': runDatabaseMaintenance,
  'health-check': runHealthCheck,
  'daily-revenue-report': runDailyRevenueReport,
  'equipment-utilization': runEquipmentUtilizationReport,
  'user-activity-summary': runUserActivitySummary,
  'ga4-sync': runGa4Sync,
  'sitemap-rebuild': runSitemapRebuild,
  'schema-refresh': runSchemaRefresh,
  'product-feeds': runProductFeeds,
  'pdpl-archive': runPdplArchive,
  'credential-rotation-check': runCredentialRotationCheck,
  'security-scan': runSecurityScan,
  'team-notifications': runTeamNotifications,
  'equipment-specs-validation': runEquipmentSpecsValidation,
  'ticket-escalation': runTicketEscalation,
  'seasonal-promos': runSeasonalPromos,
  'cron-health-alerts': runCronHealthAlerts,
  'dead-letter-review': runDeadLetterReview,
  'infrastructure-health': runInfrastructureHealth,
  'feed-validation': runFeedValidation,
  'waitlist-availability': runWaitlistAvailability,
  'review-request': runReviewRequests,
  'low-stock-alerts': runLowStockAlerts,
  'abandoned-cart-tiered': runAbandonedCartTiered,
  'zatca-invoice-sync': runZatcaInvoiceSync,
  'auto-refund-cancelled': runAutoRefundCancelled,
  'vendor-statements': runVendorStatements,
  'invoice-dunning': runInvoiceDunning,
  'pdpl-restore-drill': runPdplRestoreDrill,
}

export const CRON_JOB_SLUGS = Object.keys(CRON_JOB_REGISTRY)
