'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface Row {
  key: string
  label: string
  category: string
  type: string
  value: string
  masked?: boolean
}

export function MarketingSettingsEditor({
  categories,
  title,
}: {
  categories: string[]
  title: string
}) {
  const { toast } = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/marketing/settings')
      if (!res.ok) throw new Error('Failed')
      const data = (await res.json()) as { settings: Row[] }
      setRows(data.settings.filter((r) => categories.includes(r.category)))
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [categories, toast])

  useEffect(() => {
    void load()
  }, [load])

  const save = async (key: string, value: string) => {
    setSaving(key)
    try {
      const res = await fetch('/api/admin/marketing/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || 'Save failed')
      }
      toast({ title: 'تم الحفظ' })
      await load()
    } catch (e) {
      toast({
        title: 'فشل الحفظ',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">جاري التحميل…</p>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {rows.map((row) => (
          <div key={row.key} className="space-y-2 rounded-lg border p-4">
            <Label htmlFor={row.key}>{row.label}</Label>
            <div className="flex gap-2">
              <Input
                id={row.key}
                type={row.type === 'url' ? 'url' : 'text'}
                defaultValue={row.masked ? '' : row.value}
                placeholder={row.masked ? '•••• (أدخل قيمة جديدة للتحديث)' : ''}
                disabled={saving === row.key}
              />
              <Button
                type="button"
                size="sm"
                disabled={saving === row.key}
                onClick={(e) => {
                  const input = (e.target as HTMLElement).closest('.space-y-2')?.querySelector('input')
                  if (input instanceof HTMLInputElement) void save(row.key, input.value)
                }}
              >
                حفظ
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
