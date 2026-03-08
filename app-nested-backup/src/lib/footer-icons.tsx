/**
 * Footer icon mapping: platform/link/contact names to Lucide components.
 */

import type React from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Instagram,
  MessageCircle,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
  Ghost,
  Send,
  Phone,
  Mail,
  MapPin,
  Camera,
  Building,
  Package,
  Wrench,
  FileText,
  HelpCircle,
  User,
  ShoppingBag,
  Heart,
  BookOpen,
  Briefcase,
} from 'lucide-react'

/** Simple TikTok-style icon (musical note + play shape). Compatible with Lucide usage (className, size). */
function TikTokIconBase(props: React.SVGAttributes<SVGSVGElement> & { size?: number }) {
  const { className, size = 24, ...rest } = props
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      aria-hidden
      {...rest}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  )
}

const TikTokIconLucide = TikTokIconBase as unknown as LucideIcon

const socialIcons: Record<string, LucideIcon> = {
  instagram: Instagram,
  whatsapp: MessageCircle,
  twitter: Twitter,
  facebook: Facebook,
  linkedin: Linkedin,
  tiktok: TikTokIconLucide,
  youtube: Youtube,
  snapchat: Ghost,
  telegram: Send,
}

const contactIcons: Record<string, LucideIcon> = {
  phone: Phone,
  envelope: Mail,
  'location-dot': MapPin,
}

const linkIcons: Record<string, LucideIcon> = {
  camera: Camera,
  building: Building,
  box: Package,
  wrench: Wrench,
  file: FileText,
  'help-circle': HelpCircle,
  user: User,
  'shopping-bag': ShoppingBag,
  heart: Heart,
  book: BookOpen,
  briefcase: Briefcase,
}

const allIcons: Record<string, LucideIcon> = {
  ...socialIcons,
  ...contactIcons,
  ...linkIcons,
}

/**
 * Returns the Lucide component for a given icon name (e.g. 'instagram', 'phone', 'camera').
 */
export function getFooterIcon(name: string): LucideIcon | null {
  if (!name || typeof name !== 'string') return null
  const key = name.toLowerCase().trim()
  return allIcons[key] ?? null
}

/** All icon names for pickers (contact + link). */
export const FOOTER_ICON_NAMES = [
  ...Object.keys(contactIcons),
  ...Object.keys(linkIcons),
] as const

export { socialIcons, contactIcons, linkIcons, allIcons }
