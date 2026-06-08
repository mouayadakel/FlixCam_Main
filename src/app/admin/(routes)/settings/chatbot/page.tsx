'use client'

/**
 * Chatbot customization settings (FIX-041).
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bot, Loader2, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import type { ChatbotFaqEntry } from '@/lib/services/chatbot-settings.service'

export default function ChatbotSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [greetingAr, setGreetingAr] = useState('')
  const [greetingEn, setGreetingEn] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [tone, setTone] = useState('professional')
  const [faqEntries, setFaqEntries] = useState<ChatbotFaqEntry[]>([])

  useEffect(() => {
    fetch('/api/admin/settings/chatbot')
      .then((r) => r.json())
      .then((json) => {
        const d = json.data ?? json
        setGreetingAr(d.greetingAr ?? '')
        setGreetingEn(d.greetingEn ?? '')
        setCompanyName(d.companyName ?? '')
        setTone(d.tone ?? 'professional')
        setFaqEntries(Array.isArray(d.faqEntries) ? d.faqEntries : [])
      })
      .catch(() => {
        toast({ title: 'خطأ', description: 'فشل تحميل الإعدادات', variant: 'destructive' })
      })
      .finally(() => setLoading(false))
  }, [toast])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/chatbot', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          greetingAr,
          greetingEn,
          companyName,
          tone,
          faqEntries,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      toast({ title: 'تم الحفظ', description: 'تم تحديث إعدادات المساعد الذكي' })
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحفظ', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bot className="h-7 w-7" />
            إعدادات المساعد الذكي
          </h1>
          <p className="text-sm text-muted-foreground">تحكم في الترحيب والأسئلة الشائعة للزوار</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/support/conversations">سجل المحادثات</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الرسائل</CardTitle>
          <CardDescription>تظهر في واجهة الدردشة العامة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="greeting-ar">رسالة الترحيب (عربي)</Label>
            <Textarea id="greeting-ar" value={greetingAr} onChange={(e) => setGreetingAr(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="greeting-en">Greeting (English)</Label>
            <Textarea id="greeting-en" value={greetingEn} onChange={(e) => setGreetingEn(e.target.value)} rows={2} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company">اسم الشركة في الردود</Label>
              <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">نبرة الرد</Label>
              <Input id="tone" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="professional" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>أسئلة شائعة</CardTitle>
            <CardDescription>ردود فورية عند تطابق السؤال</CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setFaqEntries((prev) => [...prev, { question: '', answer: '' }])}
          >
            <Plus className="ms-1 h-4 w-4" />
            إضافة
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqEntries.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد أسئلة بعد.</p>
          )}
          {faqEntries.map((entry, idx) => (
            <div key={idx} className="space-y-2 rounded-lg border p-3">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFaqEntries((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Input
                placeholder="السؤال"
                value={entry.question}
                onChange={(e) =>
                  setFaqEntries((prev) =>
                    prev.map((row, i) => (i === idx ? { ...row, question: e.target.value } : row))
                  )
                }
              />
              <Textarea
                placeholder="الجواب"
                value={entry.answer}
                rows={2}
                onChange={(e) =>
                  setFaqEntries((prev) =>
                    prev.map((row, i) => (i === idx ? { ...row, answer: e.target.value } : row))
                  )
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={() => void save()} disabled={saving}>
        {saving ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
        حفظ الإعدادات
      </Button>
    </div>
  )
}
