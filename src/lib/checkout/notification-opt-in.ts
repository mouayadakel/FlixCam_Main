import { prisma } from '@/lib/db/prisma'

function readOptInFlag(checkoutFormData: unknown, key: string): boolean {
  if (!checkoutFormData || typeof checkoutFormData !== 'object') return false
  const value = (checkoutFormData as Record<string, unknown>)[key]
  return value === true || value === 'true' || value === 1
}

/** Parse SMS order-confirmation opt-in from checkout form JSON. */
export function parseSmsConfirmationOptIn(checkoutFormData: unknown): boolean {
  return readOptInFlag(checkoutFormData, 'sms_confirmation_opt_in')
}

/** Parse WhatsApp order-update opt-in from checkout form JSON. */
export function parseWhatsAppConfirmationOptIn(checkoutFormData: unknown): boolean {
  return readOptInFlag(checkoutFormData, 'whatsapp_confirmation_opt_in')
}

/** Persist notification opt-ins from checkout onto the customer profile. */
export async function persistNotificationOptIns(
  userId: string,
  checkoutFormData: unknown
): Promise<void> {
  const whatsappOptIn = parseWhatsAppConfirmationOptIn(checkoutFormData)
  if (!whatsappOptIn) return

  await prisma.user.update({
    where: { id: userId },
    data: {
      whatsappOptIn: true,
      whatsappOptInAt: new Date(),
    },
  })
}

/** Whether transactional WhatsApp may be sent to this customer. */
export function customerAllowsWhatsApp(input: {
  checkoutFormData?: unknown
  whatsappOptIn?: boolean | null
}): boolean {
  return Boolean(
    input.whatsappOptIn || parseWhatsAppConfirmationOptIn(input.checkoutFormData)
  )
}
