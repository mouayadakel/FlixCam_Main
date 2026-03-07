/**
 * Server-side public feature flags for the public website.
 * Used by (public) layout to hide/show routes and by pages to guard access.
 */

import { FeatureFlagService } from '@/lib/services/feature-flag.service'

export interface PublicFeatureFlags {
  enableBuildKit: boolean
  enableEquipmentCatalog: boolean
  enableStudios: boolean
  enablePackages: boolean
  enableHowItWorks: boolean
  enableSupport: boolean
  enableWhatsAppCta: boolean
}

export async function getPublicFeatureFlags(): Promise<PublicFeatureFlags> {
  const [
    enableBuildKit,
    enableEquipmentCatalog,
    enableStudios,
    enablePackages,
    enableHowItWorks,
    enableSupport,
    enableWhatsAppCta,
  ] = await Promise.all([
    FeatureFlagService.isEnabled('enable_build_kit'),
    FeatureFlagService.isEnabled('enable_equipment_catalog'),
    FeatureFlagService.isEnabled('enable_studios'),
    FeatureFlagService.isEnabled('enable_packages'),
    FeatureFlagService.isEnabled('enable_how_it_works'),
    FeatureFlagService.isEnabled('enable_support'),
    FeatureFlagService.isEnabled('enable_whatsapp_cta'),
  ])

  return {
    enableBuildKit,
    enableEquipmentCatalog,
    enableStudios,
    enablePackages,
    enableHowItWorks,
    enableSupport,
    enableWhatsAppCta,
  }
}
