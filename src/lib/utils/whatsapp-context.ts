/**
 * WhatsApp URL with optional pre-filled message (Phase 6.1 - context for support/booking).
 */

const DEFAULT_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966500000000'

/**
 * Build WhatsApp chat URL with optional context message (pre-filled in chat).
 * Use for "Contact support", "Booking #XYZ", etc.
 */
export function getWhatsAppUrl(options: {
  number?: string
  message?: string
}): string {
  const num = (options.number || DEFAULT_NUMBER).replace(/\D/g, '')
  const base = `https://wa.me/${num}`
  if (options.message?.trim()) {
    return `${base}?text=${encodeURIComponent(options.message.trim())}`
  }
  return base
}
