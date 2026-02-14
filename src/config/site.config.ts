/**
 * Site-wide configuration (contact, branding, URLs).
 * Use env vars for production; placeholders are for development only.
 */

export const siteConfig = {
  /** Contact information – replace via NEXT_PUBLIC_CONTACT_* in production */
  contact: {
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '+966 11 XXX XXXX',
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'contact@flixcam.rent',
    /** WhatsApp number (E.164 without +) for wa.me links */
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '966500000000',
    instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? 'https://instagram.com',
  },
  /** Brand name used in header/footer */
  brandName: 'FlixCam.rent',
} as const
