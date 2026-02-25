'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { ArrowRight, Users, Plus, Loader2, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { RecipientDialog } from './_components/recipient-dialog'
import { BUSINESS_RECIPIENT_ROLE_LABELS } from '@/lib/constants/messaging'

interface Recipient {
  id: string
  name: string
  role: string
  phone: string | null
  email: string | null
  whatsappNumber: string | null
  jobTitle: string | null
  department: string | null
  preferredChannel: string | null
  priority: number
  isActive: boolean
  isPrimary: boolean
  isBackup: boolean
  receiveTriggers: string[] | null
  messagesReceived: number
  createdAt: string
}

export default function BusinessRecipientsPage() {
  const { toast } = useToast()
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRecipientId, setEditingRecipientId] = useState<string | null>(null)
  const [deleteRecipientId, setDeleteRecipientId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function fetchRecipients() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/messaging/recipients')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setRecipients(json.recipients ?? [])
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل المستلمين', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecipients()
  }, [])

  async function handleToggle(id: string, isActive: boolean) {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/admin/messaging/recipients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setRecipients((prev) => prev.map((r) => (r.id === id ? { ...r, isActive } : r)))
      toast({ title: 'تم', description: isActive ? 'تم تفعيل المستلم' : 'تم إيقاف المستلم' })
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحديث', variant: 'destructive' })
    } finally {
      setTogglingId(null)
    }
  }

  function handleCreate() {
    setEditingRecipientId(null)
    setDialogOpen(true)
  }

  function handleEdit(id: string) {
    setEditingRecipientId(id)
    setDialogOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteRecipientId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/messaging/recipients/${deleteRecipientId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      setRecipients((prev) => prev.filter((r) => r.id !== deleteRecipientId))
      toast({ title: 'تم', description: 'تم حذف المستلم' })
      setDeleteRecipientId(null)
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const roleLabel = (role: string) => BUSINESS_RECIPIENT_ROLE_LABELS[role]?.ar ?? role
  const triggersLabel = (r: Recipient) => {
    const t = r.receiveTriggers
    if (!t || t.length === 0) return 'كل الأحداث'
    return `${t.length} حدث`
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/cms/messaging-center">
            <ArrowRight className="ml-2 h-4 w-4" />
            مركز الرسائل
          </Link>
        </Button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">المستلمون الداخليون</h1>
            <p className="text-muted-foreground">
              جهات اتصال الأعمال ومدير المستودع لاستقبال تنبيهات الطلبات
            </p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="ml-2 h-4 w-4" />
          إضافة مستلم جديد
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>المستلمون</CardTitle>
          <CardDescription>
            تفعيل/إيقاف من يستقبل تنبيهات (مثل استلام طلب جديد).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : recipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-muted-foreground">لا يوجد مستلمون.</p>
              <Button onClick={handleCreate}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة مستلم جديد
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recipients.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div>
                      <div className="font-medium">{r.name}</div>
                      {r.jobTitle && (
                        <div className="text-sm text-muted-foreground">{r.jobTitle}</div>
                      )}
                    </div>
                    <Badge variant="outline">{roleLabel(r.role)}</Badge>
                    {r.department && (
                      <span className="text-sm text-muted-foreground">{r.department}</span>
                    )}
                    {r.phone && (
                      <span className="text-sm text-muted-foreground">📞 {r.phone}</span>
                    )}
                    {r.email && (
                      <span className="text-sm text-muted-foreground">📧 {r.email}</span>
                    )}
                    {r.whatsappNumber && (
                      <span className="text-sm text-muted-foreground">📱 {r.whatsappNumber}</span>
                    )}
                    <Badge variant="secondary">{triggersLabel(r)}</Badge>
                    {r.preferredChannel && (
                      <span className="text-xs text-muted-foreground">
                        قناة: {r.preferredChannel}
                      </span>
                    )}
                    {r.isPrimary && <Badge variant="default">رئيسي</Badge>}
                    {r.isBackup && <Badge variant="secondary">احتياطي</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {r.messagesReceived ?? 0} رسالة
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.isActive}
                      onCheckedChange={(v) => handleToggle(r.id, v)}
                      disabled={togglingId === r.id}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(r.id)}>
                          <Pencil className="ml-2 h-4 w-4" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteRecipientId(r.id)}
                        >
                          <Trash2 className="ml-2 h-4 w-4" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RecipientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recipientId={editingRecipientId}
        onSuccess={fetchRecipients}
      />

      <AlertDialog
        open={!!deleteRecipientId}
        onOpenChange={() => !deleting && setDeleteRecipientId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المستلم؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
