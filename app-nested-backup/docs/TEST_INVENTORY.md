# Test Inventory — Complete Checklist

Every unit below must have a test suite. Nothing is skipped.

**Framework:** Jest (ts-jest). **Pattern:** `**/__tests__/**/*.test.{ts,tsx}`.

---

## 1. Lib — Errors (`src/lib/errors.ts`)

| Unit | Purpose |
|------|---------|
| AppError | Base error: message, statusCode, code; name and stack |
| ValidationError | Extends AppError, status 400, optional fields |
| NotFoundError | 404, resource + optional id |
| ForbiddenError | 403 |
| UnauthorizedError | 401 |
| PolicyViolationError | 403, reason in message |
| ApprovalRequiredError | 403, action in message |

---

## 2. Lib — Services (76 files)

Every exported function/method is a unit. Root services:

- ai-analytics.service.ts — getProviderStats, getDailyCostBreakdown, selectBestProvider
- ai-audit.service.ts — logAiAudit
- ai-autofill.service.ts — autofillProduct, autofillProductsBatch, autofillMissingFields, generateDescription, generateBoxContents, generateTags, suggestRelatedProducts
- ai-confidence.service.ts — getConfidence, getBulkConfidence, shouldAutoApprove, logFeedback, getProviderComparison
- ai-content-generation.service.ts — generateWithLLM, generateMasterFill
- ai-master-fill.service.ts — runMasterFill
- ai.service.ts — AIService class methods
- ai-spec-parser.service.ts — inferMissingSpecs
- ai-validation.service.ts — validateAiFill, schedulePartialRefill, validateAndRetry, validateAllProducts
- approval.service.ts — ApprovalService (create, approve, reject)
- audit.service.ts — AuditService (log)
- blog-ai.service.ts — BlogAiService (all methods)
- blog.service.ts — BlogService CRUD
- booking.service.ts — BookingService (create, update, transitions, risk check)
- bundle-recommendations.service.ts — getFrequentlyRentedTogether
- cart-merge.service.ts — mergeSessionToUser, recalculate
- cart.service.ts — CartService (all methods)
- catalog-scanner.service.ts — scanOnly, scanAndQueue, queueSingleProduct
- client.service.ts — ClientService CRUD
- column-mapper.service.ts — mapColumns, saveMappingHistory, getFieldInfo
- content-health.service.ts — calculateQualityScore, findProductsWithGaps, getProductIdsWithGaps
- contract.service.ts — ContractService CRUD and signing
- coupon.service.ts — all exported methods
- dashboard.service.ts — getKpis, getCachedKpis
- delivery.service.ts — DeliveryService CRUD and tracking
- email.service.ts — sendPasswordReset, sendVerificationEmail, send, etc.
- equipment.service.ts — EquipmentService CRUD and translations
- faq.service.ts — FaqService CRUD
- feature-flag.service.ts — FeatureFlagService CRUD
- hero-banner.service.ts — HeroBannerService CRUD
- image-processing.service.ts — all exports
- image-sourcing.service.ts / photo-sourcing.service.ts — tryBrandAssets, tryUnsplash, tryPexels, tryGoogleCSE, tryDallE, validateImageRelevance, sourceImages
- import-recommendations.service.ts — getRecommendations
- import-validation.service.ts — validateImportRows
- import-worker.ts — processImportJob
- import.service.ts — ImportService (createJob, getJob, markProcessing, appendRows, markRow, bumpProgress, markComplete, markFailed)
- inspection.service.ts — InspectionService CRUD
- integration-config.service.ts / integration.service.ts — config CRUD, test connection
- invoice-pdf.service.ts / invoice.service.ts — invoice PDF, InvoiceService CRUD
- maintenance.service.ts — MaintenanceService CRUD
- marketing.service.ts — MarketingService (campaign create/update/send/list)
- media.service.ts — MediaService upload/CRUD
- messaging-automation.service.ts — processEventForMessaging
- notification-queue.service.ts — enqueueNotification, getQueueStats
- notification.service.ts — NotificationService (send, templates)
- payout.service.ts — PayoutService CRUD
- payment.service.ts — all methods
- pdf.service.ts — PdfService (invoice/contract/quote/report PDFs)
- pdf/contract-pdf.ts — generateContractPdf
- pdf/invoice-pdf.ts — generateInvoicePdf
- pdf/promissory-note-pdf.ts — generatePromissoryNotePdf
- pdf/quote-pdf.ts — generateQuotePdf
- pdf/report-export.ts — exportReportAsPdf, exportReportAsExcel
- policy.service.ts — PolicyService CRUD
- pricing.service.ts — PricingService quote/pricing
- product-catalog.service.ts — ProductCatalogService, pricingDefaults
- product-equipment-sync.service.ts — syncProductToEquipment, syncEquipmentToProduct
- product-similarity.service.ts — embedProduct, findSimilarProducts, rebuildRelatedProducts
- promissory-note.service.ts — createBookingPromissoryNote, listPromissoryNotesForAdmin, enforcePromissoryNote, createPromissoryNoteManually, fulfillPromissoryNote, getPromissoryNoteById, getBookingPreviewForPn
- quality-scorer.service.ts — scoreProduct, scoreAllProducts, getProductsWithGaps, captureQualitySnapshot, getQualityTrend, getCachedScan
- quote.service.ts — QuoteService CRUD
- reports.service.ts — ReportsService
- seo-generation.service.ts — generateSEO, generateSEOBatch
- shoot-type.service.ts — ShootTypeService (shoot types, category flow, recommendations)
- specs-db.service.ts — lookupCuratedSpecs, lookupDeepSpecs, getKnownModels, hasModel, addToRuntime
- studio-faq.service.ts, studio-package.service.ts, studio-schedule.service.ts, studio.service.ts, studio-testimonial.service.ts — respective CRUD
- template-renderer.service.ts — renderTemplate, renderTemplateBody, renderString, TemplateRendererService
- translation.service.ts — getTranslationCacheKey, getCachedTranslation, setCachedTranslation, translateText, translateProductFields, translateBatch
- vendor.service.ts — VendorService CRUD and earnings
- warehouse.service.ts — WarehouseService (checkout, check-in, inventory)
- web-researcher.service.ts — researchProduct, getArabicSpecName, translateSpecsToArabic, isWebResearchAvailable
- whatsapp.service.ts — normalizePhoneForWhatsApp, isWhatsAppConfigured, sendWhatsAppText, sendWhatsAppTemplate, sendWhatsAppInteractiveButtons, sendWhatsAppDocument, updateMessageLogStatus
- sms.service.ts — normalizePhoneForSms, isSmsConfigured, sendSmsText, sendSmsOtp, sendSmsFromTemplate

---

## 3. Lib — Validators (41 files)

Each schema is a unit: parse valid input, reject invalid/empty/wrong type, boundaries.

- ai.validator.ts — riskAssessmentInputSchema, kitBuilderInputSchema, pricingSuggestionInputSchema, demandForecastInputSchema, chatbotMessageSchema, equipmentRecommendationInputSchema, aiConfigSchema
- auth.validator.ts — loginSchema, forgotPasswordSchema, resetPasswordSchema, sendOtpSchema, verifyOtpSchema, deferredRegisterSchema, registerFormSchema
- automation-rule.validator.ts — createAutomationRuleSchema, updateAutomationRuleSchema
- blog-ai.validator.ts — generateOutlineSchema, generateDraftSchema, rewriteSchema, translateSchema, seoMetaSchema, faqSchema, extractEquipmentSchema, altTextSchema, qualityScoreSchema, suggestLinksSchema, relatedPostsSchema, headlineOptimizerSchema, autoTagsSchema
- blog.validator.ts — createPostSchema, updatePostSchema, searchParamsSchema, reactionSchema, createCategorySchema, updateCategorySchema, createTagSchema, createAuthorSchema, updateAuthorSchema
- booking.validator.ts — createBookingSchema, updateBookingSchema, stateTransitionSchema, requestChangeSchema, requestExtensionSchema, cancelBookingSchema
- brand.validator.ts — createBrandSchema, updateBrandSchema
- business-recipient.validator.ts — createBusinessRecipientSchema, updateBusinessRecipientSchema
- category.validator.ts — createCategorySchema, updateCategorySchema
- checkout-form.validator.ts — createSectionSchema, updateSectionSchema, createFieldSchema, updateFieldSchema
- checkout.validator.ts — checkoutDetailsSchema
- client.validator.ts — clientStatusSchema, createClientSchema, updateClientSchema, clientFilterSchema
- contract.validator.ts — contractStatusSchema, signatureDataSchema, createContractSchema, updateContractSchema, signContractSchema, contractFilterSchema
- coupon.validator.ts — createCouponSchema, updateCouponSchema, validateCouponSchema, couponFilterSchema
- customer-segment.validator.ts — createCustomerSegmentSchema, updateCustomerSegmentSchema
- damage-claim.validator.ts — createDamageClaimSchema, updateDamageClaimSchema, resolveDamageClaimSchema
- delivery.validator.ts — scheduleDeliverySchema, updateDeliverySchema, updateDeliveryStatusSchema, deliveryFilterSchema
- equipment.validator.ts — createEquipmentSchema, updateEquipmentSchema, equipmentTranslationSchema
- faq.validator.ts — createFaqSchema, updateFaqSchema, reorderFaqSchema
- footer.validator.ts — footerGeneralSchema, footerBrandSchema, footerContactSchema, footerColumnSchema, footerLinkSchema, footerLegalSchema, footerNewsletterSchema
- hero-banner.validator.ts — createBannerSchema, updateBannerSchema, createSlideSchema, updateSlideSchema, reorderSlidesSchema
- invoice.validator.ts — createInvoiceSchema, updateInvoiceSchema, invoicePaymentSchema, invoiceFilterSchema
- kit.validator.ts — createKitSchema, updateKitSchema
- maintenance.validator.ts — createMaintenanceSchema, updateMaintenanceSchema, completeMaintenanceSchema, maintenanceFilterSchema
- marketing.validator.ts — createCampaignSchema, updateCampaignSchema, campaignSendSchema, campaignFilterSchema
- notification-template.validator.ts — createNotificationTemplateSchema, updateNotificationTemplateSchema, previewNotificationTemplateSchema
- payment.validator.ts — createPaymentSchema, updatePaymentSchema, paymentRefundSchema, paymentFilterSchema
- policy.validator.ts — createPolicySchema, updatePolicySchema, reorderPolicySchema
- pricing-rule.validator.ts — createPricingRuleSchema, updatePricingRuleSchema, previewPricingSchema
- promissory-note.validator.ts — createBookingPromissoryNoteSchema
- quote.validator.ts — createQuoteSchema, updateQuoteSchema, convertQuoteSchema, quoteFilterSchema
- receiver.validator.ts — createReceiverSchema, updateReceiverSchema
- recurring.validator.ts — createRecurringSeriesSchema, updateRecurringSeriesSchema
- reports.validator.ts — reportFilterSchema
- review.validator.ts — createReviewSchema, updateReviewSchema, respondToReviewSchema
- shoot-type.validator.ts — createShootTypeSchema, updateShootTypeSchema, updateCategoryFlowsSchema, updateRecommendationsSchema, setBudgetTierSchema
- studio-faq.validator.ts, studio-package.validator.ts, studio-testimonial.validator.ts — create/update/reorder schemas each
- studio.validator.ts — createStudioSchema, updateStudioSchema, updateStudioCmsSchema
- verification.validator.ts — updateUserVerificationSchema, reviewDocumentSchema, createVerificationDocumentSchema
- warehouse.validator.ts — checkOutSchema, checkInSchema, inventoryFilterSchema

---

## 4. Lib — Utils

- api-helpers.ts — handleApiError (AppError, ZodError, Prisma, unknown)
- barcode.ts — generateBarcodeValue, generateQrCodeUrl, assignBarcodeToEquipment
- blog-preview.ts — getBlogPreviewUrl
- category-icons.tsx — CATEGORY_ICON_MAP, getCategoryIcon, getIcon
- circuit-breaker.ts — CircuitOpenError, CircuitBreaker (execute, recordSuccess, recordFailure, reset, getState), geminiBreaker, openaiBreaker, dalleBreaker
- cost-tracker.ts — trackAICost, recordCost, canSpend, getSpendSummary, resetDaily, resetMonthly
- equipment-fuzzy-matcher.ts — getEquipmentForFuzzyMatch, matchEquipmentNamesToIds
- excel-parser.ts — parseExcelBuffer, parseCsvBuffer, parseSpreadsheetBuffer
- encryption.ts — encrypt, decrypt, isEncrypted
- export.utils.ts — exportToCSV
- fetch-page-text.ts — fetchPageText
- format.utils.ts — formatCurrency, formatDate, formatDateTime, formatStatus, getStatusColor
- image.utils.ts — isExternalImageUrl
- late-fee.utils.ts — computeLateFee
- letter-template.utils.ts — replacePlaceholders
- public-feature-flags.ts — getPublicFeatureFlags
- rate-limit.ts — checkRateLimit, getClientIP, rateLimitByTier, rateLimitAPI, rateLimitAuth
- rate-limit-upstash.ts — checkRateLimitUpstash, aiRateLimitResponse, blogAiRateLimitResponse
- sanitize.ts — sanitizeHtml, sanitizeContractHtml
- specifications.utils.ts — flattenStructuredSpecs, getSpecValue, getSpecArray, resolveSpecKey, convertFlatToStructured, extractQuickSpecs, extractHighlights, validateSpecifications
- sku-generator.ts — generateSKU, generateUniqueSKU
- whatsapp-context.ts — getWhatsAppUrl

---

## 5. Lib — Policies (15 files)

Each static method (canCreate, canView, etc.) is a unit.

- base.policy.ts — PolicyResult, BasePolicy (checkPermission, allowed, denied)
- ai.policy.ts — canUseAI, canViewRiskAssessment, canUseKitBuilder, canViewPricingSuggestions, canViewDemandForecast, canUseChatbot, canManageAIConfig
- booking.policy.ts — canCreate, canView, canUpdate, canDelete, canTransitionState
- client.policy.ts — canView, canCreate, canUpdate, canDelete
- contract.policy.ts — canView, canCreate, canUpdate, canSign, canDelete
- coupon.policy.ts — canView, canCreate, canUpdate, canDelete
- delivery.policy.ts — canSchedule, canUpdate, canView, canManage
- equipment.policy.ts — canCreate, canView, canEdit, canDelete
- invoice.policy.ts — canCreate, canView, canUpdate, canMarkPaid
- maintenance.policy.ts — canCreate, canView, canUpdate, canComplete, canDelete
- marketing.policy.ts — canView, canCreate, canUpdate, canSend, canDelete
- payment.policy.ts — canView, canCreate, canUpdate, canRefund, canDelete
- quote.policy.ts — canCreate, canView, canUpdate (convert/delete if present)
- reports.policy.ts — canView, canExport
- warehouse.policy.ts — canCheckOut, canCheckIn, canViewInventory, canManage

---

## 6. Lib — Auth

- config.ts — authConfig (callbacks, providers)
- session.ts — getSession, requireAuth
- auth-helpers.ts — hashPassword, verifyPassword
- permissions.ts — PERMISSIONS, hasPermission, getUserPermissions, hasAIPermission, hasAnyPermission, hasAllPermissions, matchesPermission
- matches-permission.ts — matchesPermission (wildcard)
- permission-service.ts — getEffectivePermissions, hasPermission, invalidatePermissionCache
- menu-service.ts — getUserMenu
- role-service.ts — RoleService (list, create, update, delete, checkConflicts)
- field-permission-service.ts — filterFieldsForUser, getAllowedFields
- role-details.ts — ROLE_DETAILS

---

## 7. Lib — Queue

- redis.client.ts — getRedisClient, closeRedisClient
- ai-processing.queue.ts — hasActiveWorkers, addAIProcessingJob
- ai-processing.worker.ts — createAIProcessingWorker (job handler)
- backfill.queue.ts — getBackfillQueue, addBackfillJob
- backfill.worker.ts — handler 'backfill-products', 'nightly-scan', 'nightly-backfill'
- dead-letter.queue.ts — sendToDeadLetter
- image-processing.queue.ts — addImageProcessingJob
- image-processing.worker.ts — createImageProcessingWorker
- import.queue.ts — addImportJob, getImportJobStatus, cancelImportJob
- import.worker.ts — createImportWorker, getImportWorker

---

## 8. Lib — Integrations

- whatsapp/client.ts — WhatsAppClient (sendTemplate, sendBookingConfirmation, sendPaymentReminder, sendReturnReminder), validatePhoneNumber, formatPhoneNumber
- zatca/invoice-generator.ts — generateZATCAInvoice, validateZATCAInvoiceData
- tap/client.ts — TapClient (createCharge, verifyWebhook, parseWebhookEvent, getCharge, refundCharge)

---

## 9. Lib — Hooks

- use-admin-live.ts — useAdminLive
- use-kit-queries.ts — useShootTypes, useShootTypeConfig, useEquipmentInfinite, useKitCompatibility, useKitAISuggest, useEquipmentAvailability
- use-admin-feature-flags.ts — useAdminFeatureFlags

---

## 10. Lib — Stores (Zustand)

- checkout.store.ts — setDetails, clearDetails, setStep, setDates, setFulfillment, setAddons, setPaymentMethod, setHold, setFormValues, clearHold, clearCheckout
- compare-store.ts — addItem, removeItem, clearAll, hasItem, isFull
- kit-wizard.store.ts — all set* actions, nextCategory, prevCategory, skipCategory, addEquipment, removeEquipment, setQty, setDuration, reset; getKitWizardTotalDaily, getKitWizardTotalAmount, getKitWizardSelectedCount, getKitWizardTotalUnits, getCurrentCategoryStep, getSelectedByCategory, getMissingCategories
- locale.store.ts — setLocale, initFromCookie
- cart.store.ts — fetchCart, addItem, updateItem, removeItem, applyCoupon, removeCoupon, revalidate, syncCart

---

## 11. Lib — Middleware

- read-only-edge.ts — enforceReadOnly
- read-only.middleware.ts — getReadOnlyMode, setReadOnlyMode

---

## 12. Lib — Events

- event-bus.ts — emit(eventName, payload); handlers (audit, publishAdminLive, processEventForMessaging)

---

## 13. Lib — AI, i18n, jobs, seo, analytics, settings

- ai/validation-pipeline.ts, ai/prompt-templates.ts, ai/spec-templates.ts, ai/blog-prompts.ts — exported functions/templates
- i18n/translate.ts, i18n/formatting.ts, i18n/content-helper.ts, i18n/cookie.ts, i18n/lazy-loader.ts, i18n/translation-memory.ts, i18n/locales.ts — each exported function
- jobs/reminder-scheduler.ts — exported scheduling logic
- seo/blog-json-ld.ts, seo/hreflang.ts — exported functions
- analytics.ts, analytics/multi-language-analytics.ts — exported functions
- settings/company-settings.ts, settings/promissory-note-settings.ts — get/set or load logic

---

## 14. API routes (~300+ route files)

Each route.ts exports GET/POST/PUT/PATCH/DELETE. Test each handler: status, body, auth, validation. Group by feature: Auth, Bookings, Cart, Checkout, Portal, Payments, Invoices, Quotes, Equipment, Admin (users, roles, equipment, studios, blog, ai, imports, vendors, promissory-notes, settings, cms, messaging, reports, health, read-only), Public, Vendor, Cron, Webhooks, Other (delivery, warehouse, holds, notifications, audit-logs, dashboard, analytics, marketing, maintenance, damage-claims, receivers, brands, technicians).
