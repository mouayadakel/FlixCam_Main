/**
 * @file implementation-spec.checkout.ts
 * @description Checkout wizard step definitions from Implementation Spec (§6).
 * @module config
 * @see docs/IMPLEMENTATION_SPEC.md
 */

export const CHECKOUT_STEP_0_GATE = 'gate' as const
export const CHECKOUT_STEP_1_DATES_FULFILLMENT = 'dates_fulfillment' as const
export const CHECKOUT_STEP_2_AVAILABILITY_HOLD = 'availability_hold' as const
export const CHECKOUT_STEP_3_ADDONS = 'addons' as const
export const CHECKOUT_STEP_4_DEPOSIT_PAYMENT = 'deposit_payment' as const
export const CHECKOUT_STEP_5_CONFIRM = 'confirm' as const

export const CHECKOUT_WIZARD_STEPS = [
  { key: CHECKOUT_STEP_1_DATES_FULFILLMENT, step: 1, labelKey: 'dates_fulfillment' },
  { key: CHECKOUT_STEP_2_AVAILABILITY_HOLD, step: 2, labelKey: 'availability_hold' },
  { key: CHECKOUT_STEP_3_ADDONS, step: 3, labelKey: 'addons' },
  { key: CHECKOUT_STEP_4_DEPOSIT_PAYMENT, step: 4, labelKey: 'deposit_payment' },
  { key: CHECKOUT_STEP_5_CONFIRM, step: 5, labelKey: 'confirm' },
] as const

export const CHECKOUT_HOLD_TTL_MINUTES = 15
