/**
 * @file assign-user-to-role-modal.tsx
 * @description Modal to assign a user to a specific role (role-centric flow)
 * @module components/admin/roles
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, AlertTriangle } from 'lucide-react'

interface User {
  id: string
  email: string
  name: string | null
}

interface AssignUserToRoleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleId: string
  roleName: string
  assignedUserIds: string[]
  onSuccess: () => void
}

export function AssignUserToRoleModal({
  open,
  onOpenChange,
  roleId,
  roleName,
  assignedUserIds,
  onSuccess,
}: AssignUserToRoleModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<{ message: string; permissions?: string[] } | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setWarning(null)
      setSelectedUserId('')
      setIsPrimary(false)
      setLoading(true)
      fetch(`/api/admin/users?excludeRoleId=${roleId}&pageSize=200`)
        .then((r) => r.json())
        .then((data) => setUsers(data.data || []))
        .catch(() => setError('فشل تحميل المستخدمين'))
        .finally(() => setLoading(false))
    }
  }, [open, roleId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId) {
      setError('اختر مستخدماً')
      return
    }
    setSubmitting(true)
    setError(null)
    setWarning(null)
    try {
      const res = await fetch(`/api/admin/users/${selectedUserId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId,
          isPrimary,
          expiresAt: null,
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
    } catch {
      setError('حدث خطأ')
    } finally {
      setSubmitting(false)
    }
  }

  const availableUsers = users.filter((u) => !assignedUserIds.includes(u.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>ربط مستخدم بالدور</DialogTitle>
          <DialogDescription>اختر مستخدماً لتعيينه لدور &quot;{roleName}&quot;</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {warning && (
            <div className="flex gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                {warning.message}
                {warning.permissions && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {warning.permissions.join(', ')}
                  </span>
                )}
              </div>
            </div>
          )}
          <div>
            <Label>المستخدم</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر مستخدماً" />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <div className="p-4 text-center">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    لا يوجد مستخدمون متاحون (الجميع معيّنون لهذا الدور)
                  </div>
                ) : (
                  availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email} ({u.email})
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={submitting || availableUsers.length === 0}>
              {submitting ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
              ربط
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
