/**
 * @file seo-section.tsx
 * @description SEO fields section for a single language
 * @module components/forms
 */

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SEOSectionProps {
  locale: 'ar' | 'en' | 'zh'
  value: {
    seoTitle?: string
    seoDescription?: string
    seoKeywords?: string
  }
  onChange: (value: { seoTitle?: string; seoDescription?: string; seoKeywords?: string }) => void
  name?: string // Equipment name for auto-generation
  shortDescription?: string // Short description for auto-generation
  defaultExpanded?: boolean
  className?: string
}

const localeLabels: Record<'ar' | 'en' | 'zh', string> = {
  ar: 'العربية',
  en: 'English',
  zh: '中文',
}

export function SEOSection({
  locale,
  value,
  onChange,
  name,
  shortDescription,
  defaultExpanded = false,
  className,
}: SEOSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const handleAutoGenerate = () => {
    const newValue: typeof value = {}
    
    if (name && !value.seoTitle) {
      newValue.seoTitle = `Rent ${name} in Riyadh | FlixCam.rent`
    }
    
    if (shortDescription && !value.seoDescription) {
      newValue.seoDescription = shortDescription.substring(0, 155)
    }
    
    if (name && !value.seoKeywords) {
      const keywords = [name, 'rental', 'Riyadh', 'cinema equipment']
      newValue.seoKeywords = keywords.join(', ')
    }
    
    if (Object.keys(newValue).length > 0) {
      onChange({ ...value, ...newValue })
    }
  }

  return (
    <Card className={cn('overflow-hidden', className)} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-neutral-400" />
            <h3 className="font-semibold">SEO - {localeLabels[locale]}</h3>
          </div>
          <Button type="button" variant="ghost" size="sm">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={handleAutoGenerate}>
              توليد تلقائي
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`seoTitle-${locale}`}>عنوان SEO</Label>
            <Input
              id={`seoTitle-${locale}`}
              value={value.seoTitle || ''}
              onChange={(e) => onChange({ ...value, seoTitle: e.target.value })}
              placeholder={`SEO title in ${localeLabels[locale]}`}
              maxLength={200}
              dir={locale === 'ar' ? 'rtl' : 'ltr'}
            />
            <p className="text-xs text-neutral-500">
              {value.seoTitle?.length || 0} / 200 حرف
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`seoDescription-${locale}`}>وصف SEO</Label>
            <Input
              id={`seoDescription-${locale}`}
              value={value.seoDescription || ''}
              onChange={(e) => onChange({ ...value, seoDescription: e.target.value })}
              placeholder={`SEO description in ${localeLabels[locale]}`}
              maxLength={500}
              dir={locale === 'ar' ? 'rtl' : 'ltr'}
            />
            <p className="text-xs text-neutral-500">
              {value.seoDescription?.length || 0} / 500 حرف
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`seoKeywords-${locale}`}>كلمات مفتاحية SEO</Label>
            <Input
              id={`seoKeywords-${locale}`}
              value={value.seoKeywords || ''}
              onChange={(e) => onChange({ ...value, seoKeywords: e.target.value })}
              placeholder={`Keywords separated by commas in ${localeLabels[locale]}`}
              maxLength={500}
              dir={locale === 'ar' ? 'rtl' : 'ltr'}
            />
            <p className="text-xs text-neutral-500">
              {value.seoKeywords?.length || 0} / 500 حرف
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
