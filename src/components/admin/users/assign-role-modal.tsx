/**
 * @file assign-role-modal.tsx
 * @description Modal to assign role to user with conflict detection
 * @module components/admin/users
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertTriangle } from 'lucide-react'

interface Role {
  id: string
  name: string
  displayName: string
  displayNameAr: string | null
}

interface AssignRoleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  currentRoleIds: string[]
  onSuccess: () => void
}

export function AssignRoleModal({
  open,
  onOpenChange,
  userId,
  currentRoleIds,
  onSuccess,
}: AssignRoleModalProps) {
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<{ message: string; permissions?: string[] } | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setWarning(null)
      setSelectedRoleId('')
      setIsPrimary(false)
      setExpiresAt('')
      setLoading(true)
      fetch('/api/admin/roles')
        .then((r) => r.json())
        .then((data) => setRoles(data.data || []))
        .catch(() => setError('فشل تحميل الأدوار'))
        .finally(() => setLoading(false))
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoleId) {
      setError('اختر دوراً')
      return
    }
    setSubmitting(true)
    setError(null)
    setWarning(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: selectedRoleId,
          isPrimary,
          expiresAt: expiresAt || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || data.details || 'فشل تعيين الدور')
        return
      }
      if (data.warning) setWarning(data.warning)
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError('حدث خطأ')
    } finally {
      setSubmitting(false)
    }
  }

  const availableRoles = roles.filter((r) => !currentRoleIds.includes(r.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعيين دور</DialogTitle>
          <DialogDescription>اختر الدور لتعيينه للمستخدم</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {warning && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                {warning.message}
                {warning.permissions && (
                  <span className="block mt-1 text-xs text-muted-foreground">
                    {warning.permissions.join(', ')}
                  </span>
                )}
              </div>
            </div>
          )}
          <div>
            <Label>الدور</Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر دوراً" />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <div className="p-4 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </div>
                ) : (
                  availableRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.displayNameAr || r.displayName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isPrimary"
              checked={isPrimary}
              onCheckedChange={(v) => setIsPrimary(!!v)}
            />
            <Label htmlFor="isPrimary">دور أساسي</Label>
          </div>
          <div>
            <Label htmlFor="expiresAt">تاريخ الانتهاء (اختياري)</Label>
            <input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              تعيين
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
