/**
 * Field renderers for dynamic checkout form (CMS-driven).
 * Each type renders a form control and reports value via onChange.
 */

'use client'

import type React from 'react'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLocale } from '@/hooks/use-locale'
import { GoogleMapPicker } from '../google-map-picker'

export interface CheckoutFormFieldConfig {
  id: string
  fieldKey: string
  labelEn: string
  labelAr: string
  placeholderEn?: string | null
  placeholderAr?: string | null
  fieldType: string
  isRequired: boolean
  options?: { valueEn: string; valueAr?: string }[] | null
  conditionFieldKey?: string | null
  conditionValue?: string | null
}

interface BaseFieldProps {
  field: CheckoutFormFieldConfig
  value: unknown
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
  error?: string
}

function useLabel(field: CheckoutFormFieldConfig): string {
  const locale = useLocale()
  const lang = locale.locale?.startsWith('ar') ? 'ar' : 'en'
  return lang === 'ar' ? field.labelAr : field.labelEn
}

function usePlaceholder(field: CheckoutFormFieldConfig): string {
  const locale = useLocale()
  const lang = locale.locale?.startsWith('ar') ? 'ar' : 'en'
  const ph = lang === 'ar' ? field.placeholderAr : field.placeholderEn
  return ph ?? ''
}

export function TextField({ field, value, onChange, error }: BaseFieldProps) {
  const label = useLabel(field)
  const placeholder = usePlaceholder(field)
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {field.isRequired && ' *'}
      </Label>
      <Input
        type="text"
        value={(value as string) ?? ''}
        onChange={(e) => onChange(field.fieldKey, e.target.value)}
        placeholder={placeholder}
        className={error ? 'border-destructive' : undefined}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}

export function NumberField({ field, value, onChange, error }: BaseFieldProps) {
  const label = useLabel(field)
  const placeholder = usePlaceholder(field)
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {field.isRequired && ' *'}
      </Label>
      <Input
        type="number"
        value={(value as number) ?? ''}
        onChange={(e) => onChange(field.fieldKey, e.target.valueAsNumber)}
        placeholder={placeholder}
        className={error ? 'border-destructive' : undefined}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}

export function PhoneField({ field, value, onChange, error }: BaseFieldProps) {
  const label = useLabel(field)
  const placeholder = usePlaceholder(field)
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {field.isRequired && ' *'}
      </Label>
      <Input
        type="tel"
        value={(value as string) ?? ''}
        onChange={(e) => onChange(field.fieldKey, e.target.value)}
        placeholder={placeholder}
        className={error ? 'border-destructive' : undefined}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}

export function EmailField({ field, value, onChange, error }: BaseFieldProps) {
  const label = useLabel(field)
  const placeholder = usePlaceholder(field)
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {field.isRequired && ' *'}
      </Label>
      <Input
        type="email"
        value={(value as string) ?? ''}
        onChange={(e) => onChange(field.fieldKey, e.target.value)}
        placeholder={placeholder}
        className={error ? 'border-destructive' : undefined}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}

export function CheckboxField({ field, value, onChange, error }: BaseFieldProps) {
  const label = useLabel(field)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={!!value}
          onCheckedChange={(v) => onChange(field.fieldKey, !!v)}
        />
        <Label className="font-normal">
          {label}
          {field.isRequired && ' *'}
        </Label>
      </div>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}

export function TextareaField({ field, value, onChange, error }: BaseFieldProps) {
  const label = useLabel(field)
  const placeholder = usePlaceholder(field)
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {field.isRequired && ' *'}
      </Label>
      <Textarea
        value={(value as string) ?? ''}
        onChange={(e) => onChange(field.fieldKey, e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={error ? 'border-destructive' : undefined}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}

export function DropdownField({ field, value, onChange, error }: BaseFieldProps) {
  const label = useLabel(field)
  const options = field.options ?? []
  const locale = useLocale()
  const lang = locale.locale?.startsWith('ar') ? 'ar' : 'en'
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {field.isRequired && ' *'}
      </Label>
      <Select
        value={(value as string) ?? ''}
        onValueChange={(v) => onChange(field.fieldKey, v)}
      >
        <SelectTrigger className={error ? 'border-destructive' : undefined}>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt, i) => (
            <SelectItem key={i} value={opt.valueEn}>
              {lang === 'ar' && opt.valueAr ? opt.valueAr : opt.valueEn}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}

export function RadioField({ field, value, onChange, error }: BaseFieldProps) {
  const label = useLabel(field)
  const options = field.options ?? []
  const locale = useLocale()
  const lang = locale.locale?.startsWith('ar') ? 'ar' : 'en'
  const current = (value as string) ?? ''
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {field.isRequired && ' *'}
      </Label>
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => (
          <label
            key={i}
            htmlFor={`${field.fieldKey}-${i}`}
            className="flex cursor-pointer items-center gap-2 font-normal"
          >
            <input
              id={`${field.fieldKey}-${i}`}
              type="radio"
              name={field.fieldKey}
              value={opt.valueEn}
              checked={current === opt.valueEn}
              onChange={() => onChange(field.fieldKey, opt.valueEn)}
              className="h-4 w-4"
            />
            <span>{lang === 'ar' && opt.valueAr ? opt.valueAr : opt.valueEn}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}

function getPreviewUrl(val: string): string {
  if (!val || typeof val !== 'string') return ''
  if (val.startsWith('http://') || val.startsWith('https://')) return val
  return `/api/checkout/serve-photo?id=${encodeURIComponent(val)}`
}

export function FileField({ field, value, onChange, error }: BaseFieldProps) {
  const label = useLabel(field)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrl = value && typeof value === 'string' ? getPreviewUrl(value) : ''

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/checkout/upload-document', {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Upload failed')
      }
      const data = await res.json()
      onChange(field.fieldKey, data.url ?? data.fileId)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleChange = () => {
    onChange(field.fieldKey, '')
    setUploadError(null)
    inputRef.current?.click()
  }

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {field.isRequired && ' *'}
      </Label>
      <Input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFile}
        disabled={uploading}
        className="hidden"
      />
      {previewUrl && !uploading ? (
        <div className="flex items-center gap-3">
          <img
            src={previewUrl}
            alt="Preview"
            className="h-20 w-20 rounded object-cover border"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleChange}>
            Change
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <span className="me-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Uploading...
            </>
          ) : (
            'Upload ID photo'
          )}
        </Button>
      )}
      {uploadError && <p className="text-sm text-destructive mt-1">{uploadError}</p>}
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}

export function DateField({ field, value, onChange, error }: BaseFieldProps) {
  const label = useLabel(field)
  const v = value as string | Date | undefined
  const str = v ? ((v as unknown) instanceof Date ? (v as Date).toISOString().slice(0, 10) : String(v).slice(0, 10)) : ''
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {field.isRequired && ' *'}
      </Label>
      <Input
        type="date"
        value={str}
        onChange={(e) => onChange(field.fieldKey, e.target.value)}
        className={error ? 'border-destructive' : undefined}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}

export function MapField({ field, value, onChange, error }: BaseFieldProps) {
  const label = useLabel(field)
  const mapValue =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as { address?: string; street?: string; district?: string; city?: string; lat?: number; lng?: number })
      : undefined
  return (
    <div className="space-y-2">
      <GoogleMapPicker
        label={label}
        required={field.isRequired}
        value={mapValue}
        onChange={(v) => onChange(field.fieldKey, v)}
        apiKey={typeof process !== 'undefined' ? (process.env as any).NEXT_PUBLIC_GOOGLE_MAPS_API_KEY : null}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}

export function SignatureField({ field, value, onChange, error }: BaseFieldProps) {
  const label = useLabel(field)
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {field.isRequired && ' *'}
      </Label>
      <div className="rounded-md border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        Signature pad (optional integration). Value: {value ? 'Signed' : '—'}
      </div>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}

export function MultiSelectField({ field, value, onChange, error }: BaseFieldProps) {
  const label = useLabel(field)
  const options = field.options ?? []
  const current = (value as string[]) ?? []
  const toggle = (v: string) => {
    const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v]
    onChange(field.fieldKey, next)
  }
  const locale = useLocale()
  const lang = locale.locale?.startsWith('ar') ? 'ar' : 'en'
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {field.isRequired && ' *'}
      </Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <Checkbox
              checked={current.includes(opt.valueEn)}
              onCheckedChange={() => toggle(opt.valueEn)}
            />
            <span className="text-sm">
              {lang === 'ar' && opt.valueAr ? opt.valueAr : opt.valueEn}
            </span>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}

const RENDERERS: Record<string, (props: BaseFieldProps) => React.ReactNode> = {
  text: TextField,
  number: NumberField,
  phone: PhoneField,
  email: EmailField,
  checkbox: CheckboxField,
  textarea: TextareaField,
  dropdown: DropdownField,
  radio: RadioField,
  file: FileField,
  date: DateField,
  map: MapField,
  signature: SignatureField,
  multi_select: MultiSelectField,
}

export function renderField(
  field: CheckoutFormFieldConfig,
  value: unknown,
  onChange: (key: string, value: unknown) => void,
  disabled?: boolean,
  error?: string
): React.ReactNode {
  const Comp = RENDERERS[field.fieldType] ?? TextField
  return (
    <Comp
      key={field.id}
      field={field}
      value={value}
      onChange={onChange}
      disabled={disabled}
      error={error}
    />
  )
}
