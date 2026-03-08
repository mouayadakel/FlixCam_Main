'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfidenceBadge } from '@/components/shared/confidence-badge'
import { Save, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MappedColumn {
  sourceHeader: string
  mappedField: string | null
  confidence: number
  method: string
}

interface ColumnMapperProps {
  headers: string[]
  initialMappings?: MappedColumn[]
  sampleRows?: Record<string, unknown>[]
  onMappingsChange: (mappings: MappedColumn[]) => void
  onSaveTemplate?: (name: string, mappings: MappedColumn[]) => void
}

const SYSTEM_FIELDS = [
  { value: 'skip', label: '-- تخطي --', group: 'control' },
  // Required
  { value: 'name', label: 'الاسم (EN)', group: 'required', color: 'green' },
  { value: 'brand', label: 'العلامة التجارية', group: 'required', color: 'green' },
  { value: 'model', label: 'الموديل', group: 'required', color: 'green' },
  { value: 'sku', label: 'رمز SKU', group: 'required', color: 'green' },
  { value: 'barcode', label: 'الباركود', group: 'required', color: 'green' },
  // Pricing
  { value: 'daily_price', label: 'السعر اليومي', group: 'pricing', color: 'green' },
  { value: 'weekly_price', label: 'السعر الأسبوعي', group: 'pricing', color: 'blue' },
  { value: 'monthly_price', label: 'السعر الشهري', group: 'pricing', color: 'blue' },
  { value: 'purchase_price', label: 'سعر الشراء', group: 'pricing', color: 'blue' },
  { value: 'deposit', label: 'مبلغ التأمين', group: 'pricing', color: 'blue' },
  { value: 'requires_deposit', label: 'يتطلب تأمين', group: 'pricing', color: 'blue' },
  // Inventory
  { value: 'quantity', label: 'الكمية الإجمالية', group: 'inventory', color: 'blue' },
  { value: 'quantity_available', label: 'الكمية المتاحة', group: 'inventory', color: 'blue' },
  { value: 'condition', label: 'الحالة', group: 'inventory', color: 'blue' },
  { value: 'warehouse_location', label: 'موقع المستودع', group: 'inventory', color: 'blue' },
  // Settings
  { value: 'featured', label: 'مميز', group: 'settings', color: 'blue' },
  { value: 'is_active', label: 'نشط', group: 'settings', color: 'blue' },
  { value: 'requires_assistant', label: 'يتطلب مساعد', group: 'settings', color: 'blue' },
  { value: 'budget_tier', label: 'فئة الميزانية', group: 'settings', color: 'blue' },
  { value: 'category_slug', label: 'الفئة', group: 'settings', color: 'blue' },
  { value: 'sub_category', label: 'الفئة الفرعية', group: 'settings', color: 'blue' },
  // English Content
  { value: 'description', label: 'وصف (EN)', group: 'ai', color: 'yellow' },
  { value: 'short_description', label: 'وصف مختصر (EN)', group: 'ai', color: 'yellow' },
  { value: 'long_description', label: 'وصف طويل (EN)', group: 'ai', color: 'yellow' },
  { value: 'seo_title', label: 'عنوان SEO (EN)', group: 'ai', color: 'yellow' },
  { value: 'seo_description', label: 'وصف SEO (EN)', group: 'ai', color: 'yellow' },
  { value: 'seo_keywords', label: 'كلمات SEO (EN)', group: 'ai', color: 'yellow' },
  // Arabic Content
  { value: 'name_ar', label: 'الاسم (عربي)', group: 'ai', color: 'yellow' },
  { value: 'description_ar', label: 'وصف (عربي)', group: 'ai', color: 'yellow' },
  { value: 'short_desc_ar', label: 'وصف مختصر (عربي)', group: 'ai', color: 'yellow' },
  { value: 'long_desc_ar', label: 'وصف طويل (عربي)', group: 'ai', color: 'yellow' },
  { value: 'seo_title_ar', label: 'عنوان SEO (عربي)', group: 'ai', color: 'yellow' },
  { value: 'seo_desc_ar', label: 'وصف SEO (عربي)', group: 'ai', color: 'yellow' },
  { value: 'seo_keywords_ar', label: 'كلمات SEO (عربي)', group: 'ai', color: 'yellow' },
  // Chinese Content
  { value: 'name_zh', label: 'الاسم (صيني)', group: 'ai', color: 'yellow' },
  { value: 'description_zh', label: 'وصف (صيني)', group: 'ai', color: 'yellow' },
  { value: 'short_desc_zh', label: 'وصف مختصر (صيني)', group: 'ai', color: 'yellow' },
  { value: 'long_desc_zh', label: 'وصف طويل (صيني)', group: 'ai', color: 'yellow' },
  { value: 'seo_title_zh', label: 'عنوان SEO (صيني)', group: 'ai', color: 'yellow' },
  { value: 'seo_desc_zh', label: 'وصف SEO (صيني)', group: 'ai', color: 'yellow' },
  { value: 'seo_keywords_zh', label: 'كلمات SEO (صيني)', group: 'ai', color: 'yellow' },
  // Media
  { value: 'featured_image', label: 'الصورة الرئيسية', group: 'media', color: 'blue' },
  { value: 'gallery', label: 'معرض الصور', group: 'media', color: 'blue' },
  { value: 'video', label: 'فيديو', group: 'media', color: 'blue' },
  // Content
  { value: 'specifications', label: 'المواصفات', group: 'ai', color: 'yellow' },
  { value: 'box_contents', label: 'محتوى الصندوق', group: 'ai', color: 'yellow' },
  { value: 'tags', label: 'الوسوم', group: 'ai', color: 'yellow' },
  { value: 'related_products', label: 'منتجات ذات صلة', group: 'ai', color: 'yellow' },
  { value: 'buffer_time', label: 'وقت الفاصل', group: 'settings', color: 'blue' },
  { value: 'buffer_time_unit', label: 'وحدة وقت الفاصل', group: 'settings', color: 'blue' },
]

function getColorForField(value: string): string {
  const field = SYSTEM_FIELDS.find((f) => f.value === value)
  if (!field) return ''
  switch (field.color) {
    case 'green':
      return 'border-e-green-500'
    case 'yellow':
      return 'border-e-yellow-500'
    case 'blue':
      return 'border-e-blue-500'
    default:
      return ''
  }
}

export function ColumnMapper({
  headers,
  initialMappings,
  sampleRows,
  onMappingsChange,
  onSaveTemplate,
}: ColumnMapperProps) {
  const [mappings, setMappings] = useState<MappedColumn[]>(
    initialMappings ||
      headers.map((h) => ({ sourceHeader: h, mappedField: null, confidence: 0, method: 'skip' }))
  )

  useEffect(() => {
    if (initialMappings) setMappings(initialMappings)
  }, [initialMappings])

  const handleFieldChange = useCallback(
    (index: number, field: string) => {
      const updated = [...mappings]
      updated[index] = {
        ...updated[index],
        mappedField: field === 'skip' ? null : field,
        confidence: field === 'skip' ? 0 : 100,
        method: 'manual',
      }
      setMappings(updated)
      onMappingsChange(updated)
    },
    [mappings, onMappingsChange]
  )

  const usedFields = new Set(mappings.map((m) => m.mappedField).filter(Boolean))

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">ربط الأعمدة</CardTitle>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> مطلوب
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" /> يملؤه AI
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> اختياري
            </div>
            {onSaveTemplate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSaveTemplate('default', mappings)}
              >
                <Save className="ms-1 h-3 w-3" />
                حفظ القالب
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_1fr_80px] gap-2 border-b px-2 pb-1 text-xs font-medium text-muted-foreground">
            <span>عمود Excel</span>
            <span>يربط بـ</span>
            <span>الثقة</span>
          </div>
          {mappings.map((mapping, index) => (
            <div
              key={mapping.sourceHeader}
              className={cn(
                'grid grid-cols-[1fr_1fr_80px] items-center gap-2 rounded-md border-e-4 px-2 py-1.5',
                getColorForField(mapping.mappedField || 'skip'),
                !mapping.mappedField && 'border-e-gray-200 bg-muted/30'
              )}
            >
              <span className="truncate font-mono text-sm" title={mapping.sourceHeader}>
                {mapping.sourceHeader}
              </span>
              <Select
                value={mapping.mappedField || 'skip'}
                onValueChange={(val) => handleFieldChange(index, val)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEM_FIELDS.map((field) => (
                    <SelectItem
                      key={field.value}
                      value={field.value}
                      disabled={
                        field.value !== 'skip' &&
                        usedFields.has(field.value) &&
                        mapping.mappedField !== field.value
                      }
                    >
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-center">
                {mapping.confidence > 0 ? (
                  <ConfidenceBadge confidence={mapping.confidence} showLabel={false} />
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    --
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {sampleRows && sampleRows.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              معاينة البيانات المربوطة ({Math.min(sampleRows.length, 3)} صفوف)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    {mappings
                      .filter((m) => m.mappedField)
                      .slice(0, 6)
                      .map((m) => (
                        <th key={m.sourceHeader} className="px-2 py-1 text-end font-medium">
                          {SYSTEM_FIELDS.find((f) => f.value === m.mappedField)?.label ||
                            m.mappedField}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.slice(0, 3).map((row, ri) => (
                    <tr key={ri} className="border-b">
                      {mappings
                        .filter((m) => m.mappedField)
                        .slice(0, 6)
                        .map((m) => (
                          <td key={m.sourceHeader} className="max-w-[150px] truncate px-2 py-1">
                            {String(row[m.sourceHeader] ?? '--')}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
