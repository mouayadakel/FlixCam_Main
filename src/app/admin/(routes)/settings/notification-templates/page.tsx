/**
 * @file page.tsx
 * @description Notification templates – list, create, edit (trigger, channel, subject/body)
 * @module app/admin/(routes)/settings/notification-templates
 */

'use client'

import { useState, useEffect } from 'react'
import { Mail, Plus, Edit, Trash2, RefreshCw, Eye } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

const TRIGGERS = [
  'BOOKING_CONFIRMED',
  'BOOKING_REMINDER',
  'PAYMENT_RECEIVED',
  'PAYMENT_FAILED',
  'EQUIPMENT_READY',
  'DELIVERY_SCHEDULED',
  'RETURN_REMINDER',
  'RETURN_OVERDUE',
  'DAMAGE_CLAIM_FILED',
  'INVOICE_SENT',
  'REVIEW_REQUEST',
] as const

const CHANNELS = ['EMAIL', 'SMS', 'IN_APP', 'WHATSAPP'] as const

interface Template {
  id: string
  name: string
  slug: string
  description: string | null
  trigger: string
  channel: string
  subject: string | null
  bodyText: string
  bodyHtml: string | null
  variables: string[] | null
  isActive: boolean
  language: string
  variant: string | null
  createdAt: string
  updatedAt: string
}

export default function NotificationTemplatesPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [triggerFilter, setTriggerFilter] = useState<string>('all')
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewResult, setPreviewResult] = useState<{ subject: string | null; bodyText: string; bodyHtml: string | null } | null>(null)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    trigger: '' as string,
    channel: '' as string,
    subject: '',
    bodyText: '',
    bodyHtml: '',
    isActive: true,
    language: 'en',
  })

  useEffect(() => {
    loadTemplates()
  }, [triggerFilter, channelFilter])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (triggerFilter !== 'all') params.set('trigger', triggerFilter)
      if (channelFilter !== 'all') params.set('channel', channelFilter)
      const res = await fetch(`/api/notification-templates?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load templates')
      const data = await res.json()
      setTemplates(data.templates ?? [])
    } catch {
      toast({ title: 'Error', description: 'Failed to load templates', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({
      name: '',
      slug: '',
      description: '',
      trigger: '',
      channel: '',
      subject: '',
      bodyText: 'Hello {{customerName}},\n\nYour booking {{bookingId}} is confirmed.\n\nTotal: {{totalAmount}}',
      bodyHtml: '',
      isActive: true,
      language: 'en',
    })
    setDialogOpen(true)
  }

  const openEdit = (t: Template) => {
    setEditingId(t.id)
    setForm({
      name: t.name,
      slug: t.slug,
      description: t.description ?? '',
      trigger: t.trigger,
      channel: t.channel,
      subject: t.subject ?? '',
      bodyText: t.bodyText,
      bodyHtml: t.bodyHtml ?? '',
      isActive: t.isActive,
      language: t.language,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.trigger || !form.channel || !form.bodyText.trim()) {
      toast({ title: 'Validation', description: 'Name, trigger, channel and body are required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name || form.slug || form.trigger,
        slug: form.slug || form.trigger.toLowerCase().replace(/_/g, '-'),
        description: form.description || null,
        trigger: form.trigger,
        channel: form.channel,
        subject: form.subject || null,
        bodyText: form.bodyText,
        bodyHtml: form.bodyHtml || null,
        isActive: form.isActive,
        language: form.language,
      }
      if (editingId) {
        const res = await fetch(`/api/notification-templates/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to update')
        toast({ title: 'Success', description: 'Template updated' })
      } else {
        const res = await fetch('/api/notification-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to create')
        toast({ title: 'Success', description: 'Template created' })
      }
      setDialogOpen(false)
      loadTemplates()
    } catch {
      toast({ title: 'Error', description: 'Failed to save template', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/notification-templates/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast({ title: 'Success', description: 'Template deleted' })
      setDeleteId(null)
      loadTemplates()
    } catch {
      toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const handlePreview = async () => {
    const templateId = editingId || (form.slug ? undefined : null)
    const slug = form.slug || undefined
    if (!templateId && !slug) {
      setPreviewResult({
        subject: form.subject || null,
        bodyText: form.bodyText.replace(/\{\{(\w+)\}\}/g, (_, k) => {
          const d: Record<string, string> = { customerName: 'Ahmed', bookingId: 'BK-001', totalAmount: '500 SAR' }
          return d[k] ?? `{{${k}}}`
        }),
        bodyHtml: form.bodyHtml || null,
      })
      setPreviewOpen(true)
      return
    }
    try {
      const res = await fetch('/api/notification-templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: templateId || undefined,
          slug: slug || undefined,
          language: form.language,
          data: { customerName: 'Ahmed', bookingId: 'BK-001', totalAmount: '500 SAR' },
        }),
      })
      if (!res.ok) throw new Error('Preview failed')
      const data = await res.json()
      setPreviewResult({ subject: data.subject, bodyText: data.bodyText, bodyHtml: data.bodyHtml })
      setPreviewOpen(true)
    } catch {
      setPreviewResult({
        subject: form.subject || null,
        bodyText: form.bodyText.replace(/\{\{(\w+)\}\}/g, (_, k) => {
          const d: Record<string, string> = { customerName: 'Ahmed', bookingId: 'BK-001', totalAmount: '500 SAR' }
          return d[k] ?? `{{${k}}}`
        }),
        bodyHtml: form.bodyHtml || null,
      })
      setPreviewOpen(true)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Mail className="h-8 w-8" />
            Notification Templates
          </h1>
          <p className="text-muted-foreground mt-1">Email, SMS, and in-app message templates with variables (e.g. {`{{customerName}}`})</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadTemplates}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Filter by trigger and channel. Use Handlebars-style variables in body: {`{{customerName}}`}, {`{{bookingId}}`}, {`{{totalAmount}}`}.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={triggerFilter} onValueChange={setTriggerFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Trigger" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All triggers</SelectItem>
                {TRIGGERS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ) : templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No templates found</TableCell>
                  </TableRow>
                ) : (
                  templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell><Badge variant="outline">{t.trigger}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{t.channel}</Badge></TableCell>
                      <TableCell>{t.language}</TableCell>
                      <TableCell>{t.isActive ? <Badge className="bg-green-100 text-green-800">On</Badge> : <Badge variant="secondary">Off</Badge>}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteId(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Template' : 'New Template'}</DialogTitle>
            <DialogDescription>Subject is used for email. Body supports variables like {`{{customerName}}`}, {`{{bookingId}}`}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Template name" />
              </div>
              <div>
                <label className="text-sm font-medium">Slug (unique per language)</label>
                <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="booking-confirmed" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Trigger</label>
                <Select value={form.trigger} onValueChange={(v) => setForm((f) => ({ ...f, trigger: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select trigger" /></SelectTrigger>
                  <SelectContent>
                    {TRIGGERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Channel</label>
                <Select value={form.channel} onValueChange={(v) => setForm((f) => ({ ...f, channel: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Subject (email)</label>
              <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Booking {{bookingId}} confirmed" />
            </div>
            <div>
              <label className="text-sm font-medium">Body (text)</label>
              <Textarea value={form.bodyText} onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))} rows={6} placeholder="Hello {{customerName}}..." className="font-mono text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
              <span className="text-sm">Active</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handlePreview}><Eye className="h-4 w-4 mr-2" /> Preview</Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
            <DialogDescription>Rendered with sample data</DialogDescription>
          </DialogHeader>
          {previewResult && (
            <div className="space-y-2 text-sm">
              {previewResult.subject != null && <p><strong>Subject:</strong> {previewResult.subject}</p>}
              <pre className="whitespace-pre-wrap rounded bg-muted p-3 max-h-64 overflow-auto">{previewResult.bodyText}</pre>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">{deleting ? 'Deleting...' : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
