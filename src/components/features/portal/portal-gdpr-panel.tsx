/**
 * @file portal-gdpr-panel.tsx
 * @description GDPR export and account deletion for portal users
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export function PortalGdprPanel() {
  const { toast } = useToast()
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null)

  const handleExport = async () => {
    setBusy('export')
    try {
      const res = await fetch('/api/portal/data-export')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `flixcam-data-export.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'تم تنزيل بياناتك' })
    } catch {
      toast({ title: 'فشل التصدير', variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('سيتم حذف بياناتك الشخصية وإغلاق الحساب. هل أنت متأكد؟')) return
    setBusy('delete')
    try {
      const res = await fetch('/api/portal/data-deletion', { method: 'POST' })
      if (!res.ok) throw new Error('Deletion failed')
      toast({ title: 'تم حذف الحساب' })
      window.location.href = '/login'
    } catch {
      toast({ title: 'فشل الحذف', variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      <Button variant="outline" onClick={handleExport} disabled={busy !== null}>
        {busy === 'export' ? 'جاري التصدير...' : 'تصدير بياناتي (JSON)'}
      </Button>
      <Button variant="destructive" onClick={handleDelete} disabled={busy !== null}>
        {busy === 'delete' ? 'جاري الحذف...' : 'حذف حسابي'}
      </Button>
    </div>
  )
}
