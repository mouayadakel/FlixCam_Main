/**
 * Site-wide configuration (contact, branding, URLs).
 * Use env vars for production; placeholders are for development only.
 * Brand tokens (colors, logo paths) come from theme.ts.
 */

import { theme } from './theme'

export const siteConfig = {
  /** Contact information – replace via NEXT_PUBLIC_CONTACT_* in production */
  contact: {
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '+966 11 XXX XXXX',
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'contact@flixcam.rent',
    /** WhatsApp number (E.164 without +) for wa.me links */
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '966500000000',
    instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? 'https://instagram.com',
    tiktokUrl: process.env.NEXT_PUBLIC_TIKTOK_URL ?? 'https://tiktok.com',
    linkedinUrl: process.env.NEXT_PUBLIC_LINKEDIN_URL ?? 'https://linkedin.com',
  },
  /** Brand name and tagline from theme (FLIXCAM) */
  brandName: theme.brandName,
  tagline: theme.industry,
  /** Logo paths for header (dark bg) and footer/print (light bg) */
  logoInverted: theme.assets.logoInverted,
  logoMain: theme.assets.logoMain,
} as const
