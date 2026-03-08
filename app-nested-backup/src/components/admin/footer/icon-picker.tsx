/**
 * Reusable icon picker for footer CMS (contact and link icons).
 */

'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { getFooterIcon, FOOTER_ICON_NAMES } from '@/lib/footer-icons'

interface IconPickerProps {
  value: string | null
  onChange: (value: string | null) => void
  label?: string
  placeholder?: string
}

export function IconPicker({
  value,
  onChange,
  label = 'الأيقونة',
  placeholder = 'بدون أيقونة',
}: IconPickerProps) {
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Select value={value ?? ''} onValueChange={(v) => onChange(v || null)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">{placeholder}</SelectItem>
          {FOOTER_ICON_NAMES.map((name) => {
            const Icon = getFooterIcon(name)
            return (
              <SelectItem key={name} value={name}>
                <span className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4" />}
                  {name}
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
