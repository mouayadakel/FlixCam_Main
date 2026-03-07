/**
 * @file implementation-spec.feature-toggles.ts
 * @description Canonical feature toggle keys from Implementation Spec (§8). Admin-only.
 * @module config
 * @see docs/IMPLEMENTATION_SPEC.md
 */

/**
 * All feature toggles from the implementation spec.
 * Must be switchable from admin and reflected in UI instantly.
 */
export const IMPLEMENTATION_SPEC_FEATURE_TOGGLES = [
  'enable_discounts',
  'enable_reviews',
  'enable_insurance_plans',
  'enable_deposits',
  'enable_dynamic_pricing',
  'enable_build_kit',
  'enable_support_tickets',
  'enable_whatsapp_notifications',
  'enable_bank_transfer_payments',
  'enable_credit_terms',
  'enable_public_api', // future
] as const

export type ImplementationSpecFeatureToggleKey =
  (typeof IMPLEMENTATION_SPEC_FEATURE_TOGGLES)[number]

/** Human-readable labels for admin UI */
export const FEATURE_TOGGLE_LABELS: Record<ImplementationSpecFeatureToggleKey, string> = {
  enable_discounts: 'Discounts & promo codes',
  enable_reviews: 'Customer reviews',
  enable_insurance_plans: 'Insurance plans',
  enable_deposits: 'Deposits',
  enable_dynamic_pricing: 'Dynamic pricing rules',
  enable_build_kit: 'Build a kit',
  enable_support_tickets: 'Support tickets',
  enable_whatsapp_notifications: 'WhatsApp notifications',
  enable_bank_transfer_payments: 'Bank transfer payments',
  enable_credit_terms: 'Credit terms (B2B)',
  enable_public_api: 'Public API (future)',
}
