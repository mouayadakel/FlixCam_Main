'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, Plus, Trash2 } from 'lucide-react'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'file', label: 'File upload' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'radio', label: 'Radio' },
  { value: 'multi_select', label: 'Multi-select' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'date', label: 'Date' },
  { value: 'map', label: 'Map / Location' },
  { value: 'signature', label: 'Signature' },
] as const

export interface FieldFormData {
  sectionId: string
  fieldKey: string
  labelEn: string
  labelAr: string
  placeholderEn?: string
  placeholderAr?: string
  fieldType: string
  isRequired: boolean
  isActive: boolean
  sortOrder: number
  options?: { valueEn: string; valueAr?: string }[]
  conditionFieldKey?: string
  conditionValue?: string
}

interface FieldEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: FieldFormData | null
  fieldId?: string | null
  sectionId: string
  allFieldKeys?: string[]
  onSaved: () => void
}

export function FieldEditor({
  open,
  onOpenChange,
  initialData,
  fieldId,
  sectionId,
  allFieldKeys = [],
  onSaved,
}: FieldEditorProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FieldFormData>({
    sectionId,
    fieldKey: '',
    labelEn: '',
    labelAr: '',
    fieldType: 'text',
    isRequired: false,
    isActive: true,
    sortOrder: 0,
    options: [],
  })

  useEffect(() => {
    if (initialData) {
      setForm(initialData)
    } else {
      setForm({
        sectionId,
        fieldKey: '',
        labelEn: '',
        labelAr: '',
        fieldType: 'text',
        isRequired: false,
        isActive: true,
        sortOrder: 0,
        options: [],
      })
    }
  }, [initialData, sectionId, open])

  const needsOptions = ['dropdown', 'radio', 'multi_select'].includes(form.fieldType)

  const addOption = () => {
    setForm((p) => ({
      ...p,
      options: [...(p.options || []), { valueEn: '', valueAr: '' }],
    }))
  }

  const updateOption = (index: number, field: 'valueEn' | 'valueAr', value: string) => {
    setForm((p) => ({
      ...p,
      options: (p.options || []).map((o, i) =>
        i === index ? { ...o, [field]: value } : o
      ),
    }))
  }

  const removeOption = (index: number) => {
    setForm((p) => ({
      ...p,
      options: (p.options || []).filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fieldKey.trim()) {
      alert('Field key is required')
      return
    }
    if (!/^[a-z][a-z0-9_]*$/.test(form.fieldKey)) {
      alert('Field key must be snake_case (e.g. receiver_name)')
      return
    }
    if (!fieldId && allFieldKeys.includes(form.fieldKey)) {
      alert('This field key already exists')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        options: needsOptions ? form.options : undefined,
      }
      if (fieldId) {
        const res = await fetch('/api/admin/cms/checkout-form', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'field', id: fieldId, ...payload }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Update failed')
        }
      } else {
        const res = await fetch('/api/admin/cms/checkout-form', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'field', ...payload }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Create failed')
        }
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{fieldId ? 'Edit Field' : 'Add Field'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Field key (snake_case)</Label>
            <Input
              value={form.fieldKey}
              onChange={(e) => setForm((p) => ({ ...p, fieldKey: e.target.value }))}
              placeholder="receiver_name"
              required
              disabled={!!fieldId}
            />
          </div>
          <div className="grid gap-2">
            <Label>Label (EN)</Label>
            <Input
              value={form.labelEn}
              onChange={(e) => setForm((p) => ({ ...p, labelEn: e.target.value }))}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Label (AR)</Label>
            <Input
              value={form.labelAr}
              onChange={(e) => setForm((p) => ({ ...p, labelAr: e.target.value }))}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Field type</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.fieldType}
              onChange={(e) => setForm((p) => ({ ...p, fieldType: e.target.value }))}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {needsOptions && (
            <div className="space-y-2">
              <Label>Options (value EN / AR)</Label>
              {(form.options || []).map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt.valueEn}
                    onChange={(e) => updateOption(i, 'valueEn', e.target.value)}
                    placeholder="Value (EN)"
                  />
                  <Input
                    value={opt.valueAr ?? ''}
                    onChange={(e) => updateOption(i, 'valueAr', e.target.value)}
                    placeholder="Value (AR)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(i)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                <Plus className="h-4 w-4" /> Add option
              </Button>
            </div>
          )}
          <div className="grid gap-2">
            <Label>Show only if field</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.conditionFieldKey ?? ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, conditionFieldKey: e.target.value || undefined }))
              }
            >
              <option value="">— None —</option>
              {allFieldKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          {form.conditionFieldKey && (
            <div className="grid gap-2">
              <Label>Equals value</Label>
              <Input
                value={form.conditionValue ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, conditionValue: e.target.value || undefined }))
                }
                placeholder="e.g. someone_else"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label>Sort order</Label>
            <Input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) =>
                setForm((p) => ({ ...p, sortOrder: parseInt(e.target.value, 10) || 0 }))
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.isRequired}
              onCheckedChange={(v) => setForm((p) => ({ ...p, isRequired: v }))}
            />
            <Label>Required</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
            />
            <Label>Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
