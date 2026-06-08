/**
 * Resolve the customer ID for checkout – authenticated user or guest contact details.
 */

import type { Session } from 'next-auth'
import {
  GuestCheckoutService,
  validateGuestContact,
  type GuestContactInput,
} from '@/lib/services/guest-checkout.service'
import { ValidationError } from '@/lib/errors'

export interface CheckoutCustomerContext {
  customerId: string
  actorId: string
  isGuest: boolean
}

export async function resolveCheckoutCustomer(
  session: Session | null,
  checkoutDetails?: Partial<GuestContactInput>
): Promise<CheckoutCustomerContext> {
  if (session?.user?.id) {
    return {
      customerId: session.user.id,
      actorId: session.user.id,
      isGuest: false,
    }
  }

  const name = checkoutDetails?.name?.trim() ?? ''
  const email = checkoutDetails?.email?.trim() ?? ''
  const phone = checkoutDetails?.phone?.trim() ?? ''

  if (!name || !email || !phone) {
    throw new ValidationError('Name, email, and phone are required for guest checkout')
  }

  validateGuestContact({ name, email, phone })
  const { userId } = await GuestCheckoutService.resolveOrCreateCustomer({ name, email, phone })

  return {
    customerId: userId,
    actorId: userId,
    isGuest: true,
  }
}
