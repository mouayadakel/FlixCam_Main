/**
 * Build Your Kit — single-page continuous flow.
 * Section 1: Quick Setup (shoot type + budget + duration)
 * Section 2: AI Starter Kit (when setup complete)
 * Section 3: Equipment browse (when setup complete)
 * Section 4: Review
 * Sticky sidebar + mobile bar + AI assistant
 */

'use client'

import { useKitWizardStore, getKitWizardSelectedCount } from '@/lib/stores/kit-wizard.store'
import { SetupSection } from './sections/setup-section'
import { AIStarterSection } from './sections/ai-starter-section'
import { EquipmentBrowseSection } from './sections/equipment-browse-section'
import { ReviewSection } from './sections/review-section'
import { KitSummarySidebar } from './kit-summary-sidebar'
import { KitAiAssistant } from './kit-ai-assistant'
import { BulkActionsBar } from './bulk-actions-bar'
import { ContextualUpsell } from './contextual-upsell'
import { MobileKitBar } from './mobile-kit-bar'
import { BackToTopFab } from './back-to-top-fab'

export function KitBuilderFlow() {
  const shootTypeId = useKitWizardStore((s) => s.shootTypeId)
  const budgetTier = useKitWizardStore((s) => s.budgetTier)
  const durationDays = useKitWizardStore((s) => s.durationDays)
  const selectedEquipment = useKitWizardStore((s) => s.selectedEquipment)

  const setupComplete = !!shootTypeId && !!budgetTier && durationDays >= 1
  const selectedCount = getKitWizardSelectedCount({ selectedEquipment })

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-8 space-y-12">
        <SetupSection />

        {setupComplete && (
          <>
            <AIStarterSection />
            <ContextualUpsell />
            <EquipmentBrowseSection />
            {selectedCount > 0 && <BulkActionsBar />}
          </>
        )}

        <ReviewSection />
      </div>

      <aside className="hidden lg:block lg:col-span-4">
        <div className="sticky top-24">
          <KitSummarySidebar />
        </div>
      </aside>

      <KitAiAssistant />

      <MobileKitBar />
      <BackToTopFab />
    </div>
  )
}
