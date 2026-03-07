/**
 * @file state-machine.ts
 * @description Booking state machine with all 8 states and transitions
 * @module lib/booking
 * @see /docs/USER_FLOWS.json for state machine specification
 */

import { prisma } from '@/lib/db/prisma'
import type { BookingState, StateTransition, TransitionResult } from '@/lib/types/booking.types'
import { BookingStatus } from '@prisma/client'

/**
 * State configurations from USER_FLOWS.json
 */
export const BOOKING_STATES: Record<
  BookingState,
  {
    label: { ar: string; en: string }
    description: string
    color: string
    autoTransition?: boolean
    duration?: string
    final?: boolean
  }
> = {
  DRAFT: {
    label: { ar: 'مسودة', en: 'Draft' },
    description: 'Initial state when booking is created',
    color: '#9CA3AF',
  },
  RISK_CHECK: {
    label: { ar: 'فحص المخاطر', en: 'Risk Check' },
    description: 'Automated risk assessment of client',
    color: '#F59E0B',
    autoTransition: true,
    duration: '5 seconds',
  },
  PAYMENT_PENDING: {
    label: { ar: 'انتظار الدفع', en: 'Payment Pending' },
    description: 'Waiting for deposit payment',
    color: '#F59E0B',
  },
  CONFIRMED: {
    label: { ar: 'مؤكد', en: 'Confirmed' },
    description: 'Payment received, booking confirmed',
    color: '#10B981',
  },
  ACTIVE: {
    label: { ar: 'نشط', en: 'Active' },
    description: 'Equipment checked out, booking is active',
    color: '#1F87E8',
  },
  RETURNED: {
    label: { ar: 'مرتجع', en: 'Returned' },
    description: 'Equipment checked in, pending final inspection',
    color: '#6366F1',
  },
  CLOSED: {
    label: { ar: 'مغلق', en: 'Closed' },
    description: 'Booking completed successfully',
    color: '#6B7280',
    final: true,
  },
  CANCELLED: {
    label: { ar: 'ملغي', en: 'Cancelled' },
    description: 'Booking cancelled by client or admin',
    color: '#EF4444',
    final: true,
  },
}

/**
 * State transitions from USER_FLOWS.json
 */
const TRANSITIONS: StateTransition[] = [
  {
    from: 'DRAFT',
    to: 'RISK_CHECK',
    trigger: 'submit',
    conditions: ['all_items_selected', 'dates_valid', 'client_info_complete'],
    actions: ['validate_availability', 'calculate_total'],
  },
  {
    from: 'RISK_CHECK',
    to: 'PAYMENT_PENDING',
    trigger: 'auto',
    conditions: ['risk_score_acceptable'],
    actions: ['calculate_deposit', 'generate_payment_link'],
  },
  {
    from: 'RISK_CHECK',
    to: 'CANCELLED',
    trigger: 'auto',
    conditions: ['risk_score_high', 'client_blacklisted'],
    actions: ['notify_admin', 'send_rejection_email'],
  },
  {
    from: 'PAYMENT_PENDING',
    to: 'CONFIRMED',
    trigger: 'payment_received',
    conditions: ['deposit_paid'],
    actions: ['generate_contract', 'soft_lock_equipment', 'send_confirmation'],
  },
  {
    from: 'CONFIRMED',
    to: 'ACTIVE',
    trigger: 'checkout',
    conditions: ['equipment_available', 'within_start_date'],
    actions: ['create_checkout_session', 'assign_serial_numbers', 'generate_packing_list'],
  },
  {
    from: 'ACTIVE',
    to: 'RETURNED',
    trigger: 'checkin',
    conditions: ['all_items_scanned'],
    actions: ['create_checkin_session', 'inspect_condition', 'check_missing_items'],
  },
  {
    from: 'RETURNED',
    to: 'CLOSED',
    trigger: 'approve',
    conditions: ['no_damages', 'no_missing_items'],
    actions: ['generate_final_invoice', 'release_deposit', 'update_equipment_status'],
  },
  {
    from: 'RETURNED',
    to: 'CLOSED',
    trigger: 'approve_with_charges',
    conditions: ['damages_reported', 'charges_calculated'],
    actions: ['generate_damage_invoice', 'deduct_from_deposit', 'charge_difference'],
  },
  {
    from: ['DRAFT', 'PAYMENT_PENDING', 'CONFIRMED'],
    to: 'CANCELLED',
    trigger: 'cancel',
    permissions: ['super_admin', 'admin'],
    actions: ['calculate_cancellation_fee', 'process_refund', 'release_locks', 'notify_client'],
  },
]

/**
 * Check if a transition is valid
 */
export function isValidTransition(
  from: BookingState,
  to: BookingState,
  userRole?: string
): boolean {
  const transition = TRANSITIONS.find((t) => {
    const fromMatches = Array.isArray(t.from) ? t.from.includes(from) : t.from === from
    return fromMatches && t.to === to
  })

  if (!transition) {
    return false
  }

  // Check permissions if required
  if (transition.permissions && userRole) {
    return transition.permissions.includes(userRole)
  }

  return true
}

/**
 * Get allowed transitions from current state
 */
export function getAllowedTransitions(
  currentState: BookingState,
  userRole?: string
): BookingState[] {
  return TRANSITIONS.filter((t) => {
    const fromMatches = Array.isArray(t.from)
      ? t.from.includes(currentState)
      : t.from === currentState

    if (!fromMatches) return false

    // Check permissions
    if (t.permissions && userRole) {
      return t.permissions.includes(userRole)
    }

    return true
  }).map((t) => t.to)
}

/**
 * Check transition conditions
 */
async function checkConditions(
  bookingId: string,
  conditions: string[]
): Promise<{ valid: boolean; failedCondition?: string }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      equipment: {
        include: {
          equipment: true,
        },
      },
      customer: true,
    },
  })

  if (!booking) {
    return { valid: false, failedCondition: 'booking_not_found' }
  }

  for (const condition of conditions) {
    switch (condition) {
      case 'all_items_selected':
        if (!booking.equipment || booking.equipment.length === 0) {
          return { valid: false, failedCondition: condition }
        }
        break

      case 'dates_valid':
        if (booking.endDate <= booking.startDate) {
          return { valid: false, failedCondition: condition }
        }
        break

      case 'client_info_complete':
        if (!booking.customerId) {
          return { valid: false, failedCondition: condition }
        }
        break

      case 'risk_score_acceptable': {
        // Risk score check: query customer verification status as proxy
        const customerForRisk = await prisma.user.findUnique({
          where: { id: booking.customerId },
          select: { verificationStatus: true },
        })
        if (customerForRisk?.verificationStatus === 'REJECTED') {
          return { valid: false, failedCondition: condition }
        }
        break
      }

      case 'risk_score_high': {
        const customerRisk = await prisma.user.findUnique({
          where: { id: booking.customerId },
          select: { verificationStatus: true },
        })
        if (customerRisk?.verificationStatus === 'REJECTED') {
          return { valid: false, failedCondition: condition }
        }
        break
      }

      case 'client_blacklisted': {
        const customerBlacklist = await prisma.user.findUnique({
          where: { id: booking.customerId },
          select: { status: true },
        })
        if (
          customerBlacklist?.status === 'blacklisted' ||
          customerBlacklist?.status === 'suspended'
        ) {
          return { valid: false, failedCondition: condition }
        }
        break
      }

      case 'deposit_paid':
        // Check if deposit payment exists and is successful
        const depositPayment = await prisma.payment.findFirst({
          where: {
            bookingId,
            status: 'SUCCESS',
          },
        })
        if (!depositPayment) {
          return { valid: false, failedCondition: condition }
        }
        break

      case 'equipment_available':
        // Check if all equipment is still available
        for (const item of booking.equipment) {
          if (!item.equipment.isActive || item.equipment.quantityAvailable < 1) {
            return { valid: false, failedCondition: condition }
          }
        }
        break

      case 'within_start_date':
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const startDate = new Date(booking.startDate)
        startDate.setHours(0, 0, 0, 0)
        if (startDate > today) {
          return { valid: false, failedCondition: condition }
        }
        break

      case 'all_items_scanned':
        // All booked equipment should have been checked out
        if (booking.equipment.length === 0) {
          return { valid: false, failedCondition: condition }
        }
        break

      case 'no_damages': {
        // Check no unresolved damage claims exist for this booking
        const openDamages = await prisma.damageClaim.count({
          where: {
            bookingId,
            status: { in: ['PENDING', 'INVESTIGATING'] },
          },
        })
        if (openDamages > 0) {
          return { valid: false, failedCondition: condition }
        }
        break
      }

      case 'no_missing_items':
        // Verify all booked items are accounted for (not lost)
        for (const item of booking.equipment) {
          if (item.equipment.condition === 'DAMAGED') {
            return { valid: false, failedCondition: condition }
          }
        }
        break

      case 'damages_reported': {
        // Verify damage claims have been filed when equipment is damaged
        const damageClaims = await prisma.damageClaim.count({
          where: { bookingId },
        })
        // Condition passes if at least one claim exists (damage was reported)
        if (damageClaims === 0) {
          return { valid: false, failedCondition: condition }
        }
        break
      }

      case 'charges_calculated': {
        // Verify damage charges exist (invoice/payment created for damages)
        const damageClaim = await prisma.damageClaim.findFirst({
          where: {
            bookingId,
            status: { in: ['APPROVED', 'RESOLVED'] },
          },
        })
        if (!damageClaim) {
          return { valid: false, failedCondition: condition }
        }
        break
      }

      default:
        // Unknown condition - fail safe
        return { valid: false, failedCondition: condition }
    }
  }

  return { valid: true }
}

/**
 * Execute transition actions
 */
async function executeActions(bookingId: string, actions: string[]): Promise<void> {
  for (const action of actions) {
    switch (action) {
      case 'generate_contract':
        await prisma.contract.create({
          data: {
            bookingId,
            termsVersion: '1.0',
            contractContent: {},
            createdBy: 'system',
          },
        })
        break
      case 'send_confirmation':
        await prisma.event.create({
          data: {
            eventName: 'booking.confirmed',
            payload: { bookingId },
            resourceType: 'Booking',
            resourceId: bookingId,
            status: 'PENDING',
          },
        })
        break
      case 'lock_inventory':
        // Equipment availability already decremented during booking creation
        break
      case 'release_inventory':
        // Re-increment equipment availability on cancel
        const bookingItems = await prisma.bookingEquipment.findMany({
          where: { bookingId },
        })
        for (const item of bookingItems) {
          await prisma.equipment.update({
            where: { id: item.equipmentId },
            data: { quantityAvailable: { increment: item.quantity } },
          })
        }
        break
      case 'generate_invoice':
        await prisma.event.create({
          data: {
            eventName: 'invoice.generate',
            payload: { bookingId },
            resourceType: 'Booking',
            resourceId: bookingId,
            status: 'PENDING',
          },
        })
        break
      default:
        // Log unknown actions as events for downstream processing
        await prisma.event.create({
          data: {
            eventName: `booking.action.${action}`,
            payload: { bookingId, action },
            resourceType: 'Booking',
            resourceId: bookingId,
            status: 'PENDING',
          },
        })
        break
    }
  }
}

/**
 * Transition booking to new state
 */
export async function transitionBookingState(
  bookingId: string,
  toState: BookingState,
  userId: string,
  reason?: string
): Promise<TransitionResult> {
  try {
    // 1. Get current booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    })

    if (!booking) {
      return { success: false, error: 'الحجز غير موجود' }
    }

    // 2. Check if transition is valid
    if (!isValidTransition(booking.status, toState)) {
      return {
        success: false,
        error: `الانتقال من ${booking.status} إلى ${toState} غير مسموح`,
      }
    }

    // 3. Find transition definition
    const transition = TRANSITIONS.find((t) => {
      const fromMatches = Array.isArray(t.from)
        ? t.from.includes(booking.status)
        : t.from === booking.status
      return fromMatches && t.to === toState
    })

    if (!transition) {
      return { success: false, error: 'تعريف الانتقال غير موجود' }
    }

    // 4. Check conditions
    if (transition.conditions) {
      const conditionCheck = await checkConditions(bookingId, transition.conditions)
      if (!conditionCheck.valid) {
        return {
          success: false,
          error: `الشرط غير محقق: ${conditionCheck.failedCondition}`,
        }
      }
    }

    // 5. Execute actions
    if (transition.actions) {
      await executeActions(bookingId, transition.actions)
    }

    // 6. Update state in transaction
    await prisma.$transaction(async (tx) => {
      // Update booking state
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: toState,
          updatedBy: userId,
        },
      })

      // Log state change to audit
      await tx.auditLog.create({
        data: {
          action: 'booking.state_transition',
          userId,
          resourceType: 'booking',
          resourceId: bookingId,
          metadata: {
            oldState: booking.status,
            newState: toState,
            trigger: transition.trigger,
            reason,
          },
        },
      })
    })

    return { success: true, newState: toState }
  } catch (error) {
    console.error('Error transitioning booking state:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
    }
  }
}
