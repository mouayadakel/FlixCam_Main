/**
 * Translation Management Dashboard
 * Sprint 4: Admin tool for managing i18n translations
 */

import { Suspense } from 'react'
import { TranslationDashboard } from './translation-dashboard'

export const metadata = {
  title: 'Translation Management | Admin',
  description: 'Manage translations for Arabic, English, and Chinese',
}

export default function TranslationsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Translation Management</h1>
        <p className="mt-2 text-muted-foreground">
          Manage translations across all supported locales (Arabic, English, Chinese)
        </p>
      </div>

      <Suspense fallback={<div>Loading translations...</div>}>
        <TranslationDashboard />
      </Suspense>
    </div>
  )
}
