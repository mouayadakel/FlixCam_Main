/**
 * Renders checkout form from CMS config (GET /api/checkout/form-config?step=N).
 * Evaluates conditional visibility and collects values into a flat record.
 */

'use client'

import type React from 'react'
import { useEffect, useState, useCallback } from 'react'
import {
  renderField,
  type CheckoutFormFieldConfig,
} from './field-renderers'

export interface CheckoutFormSectionConfig {
  id: string
  nameEn: string
  nameAr: string
  step: number
  sortOrder: number
  isActive: boolean
  fields: CheckoutFormFieldConfig[]
}

export type { CheckoutFormFieldConfig }

export type CustomFieldRender = (
  field: CheckoutFormFieldConfig,
  value: unknown,
  onChange: (key: string, value: unknown) => void
) => React.ReactNode

export interface DynamicFormRendererProps {
  step: 1 | 2 | 3
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
  /** Optional: validate required fields; return list of fieldKeys that are missing */
  onValidate?: () => string[]
  /** Optional: custom render for specific fields (e.g. saved receiver selector) */
  customFieldRender?: CustomFieldRender
  className?: string
}

export function DynamicFormRenderer({
  step,
  values,
  onChange,
  customFieldRender,
  className,
}: DynamicFormRendererProps) {
  const [sections, setSections] = useState<CheckoutFormSectionConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/checkout/form-config?step=${step}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load form config')
        return res.json()
      })
      .then((data: { sections?: CheckoutFormSectionConfig[] }) => {
        if (!cancelled) setSections(data.sections ?? [])
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [step])

  const handleFieldChange = useCallback(
    (fieldKey: string, value: unknown) => {
      onChange({ ...values, [fieldKey]: value })
    },
    [values, onChange]
  )

  const shouldShowField = useCallback(
    (field: CheckoutFormFieldConfig): boolean => {
      if (!field.conditionFieldKey || field.conditionValue == null) return true
      const depValue = values[field.conditionFieldKey]
      const strDep = depValue != null ? String(depValue) : ''
      return strDep === field.conditionValue
    },
    [values]
  )

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 rounded-md border bg-muted/30 p-4">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-10 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="h-10 rounded bg-muted" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div className={className}>
      {sections.map((section) => (
        <div key={section.id} className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {section.nameEn}
            {section.nameAr && (
              <span className="ml-1 font-normal text-muted-foreground">/ {section.nameAr}</span>
            )}
          </h3>
          <div className="space-y-4">
            {(section.fields || []).map((field) => {
              if (!shouldShowField(field)) return null
              if (customFieldRender) {
                const custom = customFieldRender(field, values[field.fieldKey], handleFieldChange)
                if (custom != null) return <div key={field.id}>{custom}</div>
              }
              return renderField(
                field,
                values[field.fieldKey],
                handleFieldChange
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
