/**
 * Build Your Kit wizard page. Guarded by enable_build_kit feature flag.
 */

import { redirect } from 'next/navigation'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { BuildYourKitClient } from './client'

export default async function BuildYourKitPage() {
  const enabled = await FeatureFlagService.isEnabled('enable_build_kit')
  if (!enabled) {
    redirect('/')
  }
  return <BuildYourKitClient />
}
