'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SpecificationsDisplay } from '@/components/features/equipment/specifications-display'
import type { AnySpecifications } from '@/lib/types/specifications.types'

export interface SpecificationsLivePreviewProps {
  /** Current specifications value from form (updates live as user edits) */
  specifications: AnySpecifications | null | undefined
  className?: string
}

export function SpecificationsLivePreview({
  specifications,
  className,
}: SpecificationsLivePreviewProps) {
  const [previewLocale, setPreviewLocale] = useState<'en' | 'ar'>('ar')

  return (
    <Card className={`min-w-0 shrink-0 lg:col-span-1 lg:max-w-[340px] ${className ?? ''}`}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-base">Live preview</CardTitle>
        <div className="flex gap-1">
          <Button
            type="button"
            variant={previewLocale === 'en' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPreviewLocale('en')}
          >
            EN
          </Button>
          <Button
            type="button"
            variant={previewLocale === 'ar' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPreviewLocale('ar')}
          >
            AR
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 overflow-hidden">
        <div
          className="min-w-0 rounded-lg border border-border-light/60 bg-white p-4"
          dir={previewLocale === 'ar' ? 'rtl' : 'ltr'}
        >
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Preview ({previewLocale === 'ar' ? 'AR' : 'EN'})
          </p>
          <SpecificationsDisplay
            specifications={specifications}
            locale={previewLocale}
            showQuickSpecPills={true}
          />
        </div>
      </CardContent>
    </Card>
  )
}
