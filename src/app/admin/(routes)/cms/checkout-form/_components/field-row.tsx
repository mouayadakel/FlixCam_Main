'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'

export interface CheckoutFormFieldRecord {
  id: string
  fieldKey: string
  labelEn: string
  labelAr: string
  fieldType: string
  isRequired: boolean
  isSystem: boolean
  isActive: boolean
  sortOrder: number
}

interface FieldRowProps {
  field: CheckoutFormFieldRecord
  onEdit: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  isSystem: boolean
}

const typeLabels: Record<string, string> = {
  text: 'Text',
  number: 'Number',
  phone: 'Phone',
  email: 'Email',
  checkbox: 'Checkbox',
  file: 'File',
  dropdown: 'Dropdown',
  radio: 'Radio',
  multi_select: 'Multi',
  textarea: 'Textarea',
  date: 'Date',
  map: 'Map',
  signature: 'Signature',
}

export function FieldRow({
  field,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  isSystem,
}: FieldRowProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      <span className="cursor-grab shrink-0 text-muted-foreground" title="Drag to reorder">
        <GripVertical className="h-4 w-4" />
      </span>
      <span className="w-16 shrink-0 font-medium text-muted-foreground">
        {typeLabels[field.fieldType] ?? field.fieldType}
      </span>
      <span className="min-w-0 flex-1 truncate" title={`${field.labelEn} / ${field.labelAr}`}>
        {field.labelEn}
        {field.labelAr && field.labelAr !== field.labelEn && (
          <span className="ml-1 text-muted-foreground">/ {field.labelAr}</span>
        )}
      </span>
      {field.isRequired && (
        <Badge variant="secondary" className="text-xs">
          Required
        </Badge>
      )}
      {!field.isActive && (
        <Badge variant="outline" className="text-xs">
          Inactive
        </Badge>
      )}
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" variant="ghost" size="icon" onClick={onMoveUp} disabled={!canMoveUp}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onMoveDown}
          disabled={!canMoveDown}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={isSystem}
          title={isSystem ? 'System field cannot be deleted' : 'Delete'}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
