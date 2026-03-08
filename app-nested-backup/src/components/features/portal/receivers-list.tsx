/**
 * Saved receivers list with add, edit, delete, set default.
 */

'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, Star } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Receiver {
  id: string
  name: string
  idNumber: string
  phone: string
  idPhotoUrl: string
  isDefault?: boolean
  createdAt?: string
}

export function ReceiversList() {
  const { t } = useLocale()
  const [list, setList] = useState<Receiver[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', idNumber: '' })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchReceivers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/receivers')
      const data = await res.json().catch(() => ({}))
      setList(data.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReceivers()
  }, [])

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/receivers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })
      if (res.ok) await fetchReceivers()
    } catch {
      // ignore
    }
  }

  const handleEdit = (r: Receiver) => {
    setEditId(r.id)
    setEditForm({ name: r.name, phone: r.phone, idNumber: r.idNumber })
  }

  const handleSaveEdit = async () => {
    if (!editId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/receivers/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        setEditId(null)
        await fetchReceivers()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/receivers/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteId(null)
        await fetchReceivers()
      }
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('portal.receivers')}</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-muted-foreground">{t('portal.noReceivers')}</p>
          ) : (
            <ul className="space-y-3">
              {list.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">
                      {r.name}
                      {r.isDefault && (
                        <Badge variant="secondary" className="ms-2">
                          {t('portal.default')}
                        </Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground" dir="ltr">
                      {r.phone}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!r.isDefault && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleSetDefault(r.id)}
                        aria-label={t('portal.setDefault')}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(r)}
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteId(r.id)}
                      aria-label={t('common.delete')}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('portal.editReceiver')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('portal.receiverName')}</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('portal.receiverPhone')}</Label>
              <Input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('portal.receiverIdNumber')}</Label>
              <Input
                value={editForm.idNumber}
                onChange={(e) => setEditForm((p) => ({ ...p, idNumber: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('portal.deleteReceiver')}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">{t('portal.deleteReceiverConfirm')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t('common.deleting') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
