'use client'

import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import type { CheckoutFormSectionRecord } from './section-card'

interface FormPreviewProps {
  sections: CheckoutFormSectionRecord[]
  step: number
  locale: 'en' | 'ar'
  className?: string
}

export function FormPreview({ sections, step, locale, className }: FormPreviewProps) {
  const filtered = useMemo(
    () => sections.filter((s) => s.step === step && s.isActive),
    [sections, step]
  )

  const label = (field: { labelEn: string; labelAr: string }) =>
    locale === 'ar' ? field.labelAr : field.labelEn

  return (
    <div className={className}>
      <div className="mb-2 text-sm font-medium text-muted-foreground">
        Preview – Step {step} ({locale === 'ar' ? 'AR' : 'EN'})
      </div>
      <div className="space-y-6 rounded-lg border bg-card p-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sections for this step.</p>
        ) : (
          filtered.map((section) => (
            <div key={section.id} className="space-y-3">
              <div className="text-sm font-semibold">
                {locale === 'ar' ? section.nameAr : section.nameEn}
              </div>
              <div className="space-y-2">
                {(section.fields || []).map((field) => (
                  <div key={field.id} className="space-y-1">
                    <Label className="text-xs">
                      {label(field)}
                      {field.isRequired && ' *'}
                    </Label>
                    {field.fieldType === 'checkbox' && (
                      <div className="flex items-center gap-2">
                        <Checkbox disabled />
                      </div>
                    )}
                    {['text', 'number', 'phone', 'email'].includes(field.fieldType) && (
                      <Input
                        placeholder={locale === 'ar' ? '...' : '...'}
                        disabled
                        className="h-8"
                      />
                    )}
                    {field.fieldType === 'textarea' && (
                      <textarea
                        className="min-h-[60px] w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm"
                        disabled
                        placeholder="..."
                      />
                    )}
                    {['dropdown', 'radio'].includes(field.fieldType) && (
                      <div className="flex flex-wrap gap-2">
                        {(field as { options?: { valueEn: string }[] }).options?.map((o, i) => (
                          <span
                            key={i}
                            className="rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground"
                          >
                            {locale === 'ar' ? (o as { valueAr?: string }).valueAr : o.valueEn}
                          </span>
                        )) ?? <span className="text-xs text-muted-foreground">Options</span>}
                      </div>
                    )}
                    {field.fieldType === 'file' && (
                      <div className="rounded-md border border-dashed border-muted-foreground/30 px-3 py-4 text-center text-xs text-muted-foreground">
                        [File upload]
                      </div>
                    )}
                    {field.fieldType === 'map' && (
                      <div className="rounded-md border border-dashed border-muted-foreground/30 px-3 py-4 text-center text-xs text-muted-foreground">
                        [Map picker]
                      </div>
                    )}
                    {!['checkbox', 'text', 'number', 'phone', 'email', 'textarea', 'dropdown', 'radio', 'file', 'map'].includes(
                      field.fieldType
                    ) && (
                      <Input disabled className="h-8" placeholder={`${field.fieldType}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
