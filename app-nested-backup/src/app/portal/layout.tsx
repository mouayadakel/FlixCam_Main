/**
 * @file portal/layout.tsx
 * @description Portal layout with public site chrome (header + footer) and sidebar.
 * Uses same PublicHeader and PublicFooter as homepage for theme consistency.
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPublicFeatureFlags } from '@/lib/utils/public-feature-flags'
import { PortalPublicChrome } from '@/components/portal/portal-public-chrome'

/** Force dynamic so layout is never statically cached (ensures new chrome is always used). */
export const dynamic = 'force-dynamic'

const DEFAULT_PUBLIC_FLAGS = {
  enableBuildKit: true,
  enableEquipmentCatalog: true,
  enableStudios: true,
  enablePackages: true,
  enableHowItWorks: true,
  enableSupport: true,
  enableWhatsAppCta: true,
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) {
    redirect('/login?callbackUrl=/portal/dashboard')
  }

  let flags = DEFAULT_PUBLIC_FLAGS
  try {
    flags = await getPublicFeatureFlags()
  } catch {
    // use defaults so layout always renders with public chrome
  }

  return <PortalPublicChrome flags={flags}>{children}</PortalPublicChrome>
}
