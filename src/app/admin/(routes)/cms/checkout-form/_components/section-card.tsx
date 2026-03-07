'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus } from 'lucide-react'
import { FieldRow, type CheckoutFormFieldRecord } from './field-row'
import type { SectionFormData } from './section-editor'
import type { FieldFormData } from './field-editor'

export interface CheckoutFormSectionRecord {
  id: string
  nameEn: string
  nameAr: string
  step: number
  sortOrder: number
  isSystem: boolean
  isActive: boolean
  fields: CheckoutFormFieldRecord[]
}

interface SectionCardProps {
  section: CheckoutFormSectionRecord
  allFieldKeys: string[]
  onEditSection: (data: SectionFormData) => void
  onDeleteSection: () => void
  onAddField: () => void
  onEditField: (data: FieldFormData, fieldId: string) => void
  onDeleteField: (fieldId: string, isSystem: boolean) => void
  onMoveField: (fieldId: string, direction: 'up' | 'down') => void
}

export function SectionCard({
  section,
  allFieldKeys,
  onEditSection,
  onDeleteSection,
  onAddField,
  onEditField,
  onDeleteField,
  onMoveField,
}: SectionCardProps) {
  const [open, setOpen] = useState(true)
  const fields = section.fields || []

  return (
    <Card className="min-w-0">
      <CardHeader
        className="flex cursor-pointer flex-row flex-wrap items-center justify-between gap-2 py-4"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          <span className="min-w-0 truncate font-semibold" title={`${section.nameEn}${section.nameAr ? ` / ${section.nameAr}` : ''}`}>
            {section.nameEn}
            {section.nameAr && (
              <span className="text-muted-foreground"> / {section.nameAr}</span>
            )}
          </span>
          <span className="flex shrink-0 flex-wrap gap-1">
            <Badge variant="outline">Step {section.step}</Badge>
            {section.isSystem && (
              <Badge variant="secondary">System</Badge>
            )}
            {!section.isActive && (
              <Badge variant="outline">Inactive</Badge>
            )}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault()
              onEditSection({
                nameEn: section.nameEn,
                nameAr: section.nameAr,
                step: section.step,
                sortOrder: section.sortOrder,
                isActive: section.isActive,
              })
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault()
              onDeleteSection()
            }}
            disabled={section.isSystem}
            title={section.isSystem ? 'System section cannot be deleted' : 'Delete section'}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-2 pt-0">
            {fields.map((field, idx) => (
              <FieldRow
                key={field.id}
                field={field}
                onEdit={() =>
                  onEditField(
                    {
                      sectionId: section.id,
                      fieldKey: field.fieldKey,
                      labelEn: field.labelEn,
                      labelAr: field.labelAr,
                      fieldType: field.fieldType,
                      isRequired: field.isRequired,
                      isActive: field.isActive,
                      sortOrder: field.sortOrder,
                      conditionFieldKey: (field as { conditionFieldKey?: string }).conditionFieldKey,
                      conditionValue: (field as { conditionValue?: string }).conditionValue,
                      options: (field as { options?: { valueEn: string; valueAr?: string }[] }).options,
                    },
                    field.id
                  )
                }
                onDelete={() => onDeleteField(field.id, field.isSystem)}
                onMoveUp={() => onMoveField(field.id, 'up')}
                onMoveDown={() => onMoveField(field.id, 'down')}
                canMoveUp={idx > 0}
                canMoveDown={idx < fields.length - 1}
                isSystem={field.isSystem}
              />
            ))}
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={onAddField}>
              <Plus className="h-4 w-4" /> Add field
            </Button>
          </CardContent>
      )}
    </Card>
  )
}
