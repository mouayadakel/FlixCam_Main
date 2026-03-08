/**
 * SEO meta fields (metaTitle, metaDescription, keywords) for AR and EN.
 */

'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface SeoFieldsProps {
  metaTitleAr: string
  metaTitleEn: string
  metaDescriptionAr: string
  metaDescriptionEn: string
  metaKeywordsAr: string
  metaKeywordsEn: string
  onChange: (field: string, value: string | null) => void
  className?: string
}

const fields = [
  { key: 'metaTitleAr', labelAr: 'عنوان الميتا (عربي)', labelEn: 'Meta Title (AR)', maxLength: 70, rows: 1 },
  { key: 'metaTitleEn', labelAr: 'عنوان الميتا (إنجليزي)', labelEn: 'Meta Title (EN)', maxLength: 70, rows: 1 },
  { key: 'metaDescriptionAr', labelAr: 'وصف الميتا (عربي)', labelEn: 'Meta Description (AR)', maxLength: 160, rows: 2 },
  { key: 'metaDescriptionEn', labelAr: 'وصف الميتا (إنجليزي)', labelEn: 'Meta Description (EN)', maxLength: 160, rows: 2 },
  { key: 'metaKeywordsAr', labelAr: 'الكلمات المفتاحية (عربي)', labelEn: 'Keywords (AR)', maxLength: 500, rows: 1 },
  { key: 'metaKeywordsEn', labelAr: 'الكلمات المفتاحية (إنجليزي)', labelEn: 'Keywords (EN)', maxLength: 500, rows: 1 },
] as const

export function SeoFields({
  metaTitleAr,
  metaTitleEn,
  metaDescriptionAr,
  metaDescriptionEn,
  metaKeywordsAr,
  metaKeywordsEn,
  onChange,
  className,
}: SeoFieldsProps) {
  const values: Record<string, string> = {
    metaTitleAr,
    metaTitleEn,
    metaDescriptionAr,
    metaDescriptionEn,
    metaKeywordsAr,
    metaKeywordsEn,
  }

  return (
    <div className={cn('space-y-4', className)}>
      {fields.map(({ key, labelAr, labelEn, maxLength, rows }) => (
        <div key={key} className="space-y-2">
          <Label className="text-sm">
            {labelEn} <span className="text-muted-foreground">({labelAr})</span>
          </Label>
          {rows === 1 ? (
            <Input
              value={values[key] ?? ''}
              onChange={(e) => onChange(key, e.target.value || null)}
              placeholder={`Max ${maxLength} chars`}
              maxLength={maxLength}
            />
          ) : (
            <Textarea
              value={values[key] ?? ''}
              onChange={(e) => onChange(key, e.target.value || null)}
              placeholder={`Max ${maxLength} chars`}
              maxLength={maxLength}
              rows={rows}
              className="resize-none"
            />
          )}
          <p className="text-xs text-muted-foreground">
            {values[key]?.length ?? 0} / {maxLength}
          </p>
        </div>
      ))}
    </div>
  )
}
