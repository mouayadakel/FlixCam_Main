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
import { ArrowRight, Settings, Plus, Loader2, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { AutomationRuleDialog } from './_components/automation-rule-dialog'
import { RECIPIENT_TYPE_LABELS } from '@/lib/constants/messaging'

interface Rule {
  id: string
  name: string
  description: string | null
  trigger: string
  channels: string[]
  templateId: string | null
  isActive: boolean
  triggerDelay: number
  delayMinutes: number
  sendWindow: { start: string; end: string } | null
  recipientType: string
  sentCount: number
  failedCount: number
  createdAt: string
}

export default function AutomationRulesPage() {
  const { toast } = useToast()
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function fetchRules() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/messaging/automation-rules')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setRules(json.rules ?? [])
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل القواعد', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRules()
  }, [])

  async function handleToggle(id: string, isActive: boolean) {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/admin/messaging/automation-rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, isActive } : r)))
      toast({ title: 'تم', description: isActive ? 'تم تفعيل القاعدة' : 'تم إيقاف القاعدة' })
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحديث', variant: 'destructive' })
    } finally {
      setTogglingId(null)
    }
  }

  function handleCreate() {
    setEditingRuleId(null)
    setDialogOpen(true)
  }

  function handleEdit(id: string) {
    setEditingRuleId(id)
    setDialogOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteRuleId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/messaging/automation-rules/${deleteRuleId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      setRules((prev) => prev.filter((r) => r.id !== deleteRuleId))
      toast({ title: 'تم', description: 'تم حذف القاعدة' })
      setDeleteRuleId(null)
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const delayLabel = (r: Rule) => {
    const d = r.triggerDelay ?? r.delayMinutes ?? 0
    return d > 0 ? `${d} د` : 'فوري'
  }
  const sendWindowLabel = (r: Rule) => {
    const sw = r.sendWindow
    return sw && sw.start && sw.end ? `${sw.start}–${sw.end}` : '—'
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/cms/messaging-center">
            <ArrowRight className="ms-2 h-4 w-4" />
            مركز الرسائل
          </Link>
        </Button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">قواعد الأتمتة</h1>
            <p className="text-muted-foreground">
              عند حدوث حدث (مثل تأكيد الحجز) يتم إرسال رسالة عبر القنوات المختارة
            </p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="ms-2 h-4 w-4" />
          إضافة قاعدة جديدة
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>القواعد</CardTitle>
          <CardDescription>
            تفعيل/إيقاف كل قاعدة. عند الحدث يُتحقق من القناة المفعلة ثم يُرسل القالب.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-muted-foreground">لا توجد قواعد.</p>
              <Button onClick={handleCreate}>
                <Plus className="ms-2 h-4 w-4" />
                إضافة قاعدة جديدة
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    <Badge variant="outline">{r.trigger}</Badge>
                    {r.channels?.map((c) => (
                      <Badge key={c} variant="secondary">
                        {c}
                      </Badge>
                    ))}
                    <span className="text-xs text-muted-foreground">
                      تأخير {delayLabel(r)} · {RECIPIENT_TYPE_LABELS[r.recipientType]?.ar ?? r.recipientType}
                    </span>
                    {r.sendWindow && (
                      <span className="text-xs text-muted-foreground">
                        نافذة {sendWindowLabel(r)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {r.sentCount ?? 0} ✓ / {r.failedCount ?? 0} ✗
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
                          <Pencil className="ms-2 h-4 w-4" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteRuleId(r.id)}
                        >
                          <Trash2 className="ms-2 h-4 w-4" />
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

      <AutomationRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ruleId={editingRuleId}
        onSuccess={fetchRules}
      />

      <AlertDialog open={!!deleteRuleId} onOpenChange={() => !deleting && setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه القاعدة؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
