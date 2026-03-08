/**
 * @file page.tsx
 * @description Clone role with new name
 * @module app/admin/(routes)/settings/roles/[id]/clone
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, Copy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function CloneRolePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [role, setRole] = useState<{
    id: string
    displayName: string
    displayNameAr: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const id = params?.id as string

  useEffect(() => {
    if (id) {
      fetch(`/api/admin/roles/${id}`)
        .then((r) => r.json())
        .then((data) => {
          const r = data.data
          setRole(r)
          if (r?.name) setNewName(`${r.name}_copy`)
        })
        .catch(() =>
          toast({ title: 'خطأ', description: 'فشل تحميل الدور', variant: 'destructive' })
        )
        .finally(() => setLoading(false))
    }
  }, [id, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      toast({ title: 'بيانات ناقصة', description: 'أدخل الاسم الجديد', variant: 'destructive' })
      return
    }
    const sanitized = newName.trim().toLowerCase().replace(/\s+/g, '_')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/roles/${id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: sanitized }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل النسخ')
      toast({ title: 'تم النسخ', description: 'تم إنشاء نسخة من الدور بنجاح' })
      router.push(`/admin/settings/roles/${data.data?.id}`)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل نسخ الدور',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!role) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">لم يتم العثور على الدور.</p>
        <Button variant="outline" asChild>
          <Link href="/admin/settings/roles">العودة</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/settings/roles" className="hover:text-foreground">
          الأدوار والصلاحيات
        </Link>
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        <Link href={`/admin/settings/roles/${id}`} className="hover:text-foreground">
          {role.displayNameAr || role.displayName}
        </Link>
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        <span>نسخ الدور</span>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              نسخ الدور
            </CardTitle>
            <CardDescription>
              إنشاء نسخة من &quot;{role.displayNameAr || role.displayName}&quot; باسم جديد. سيتم نسخ
              جميع الصلاحيات.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="newName">الاسم الجديد (معرّف، لاتيني)</Label>
              <Input
                id="newName"
                placeholder="custom_role_copy"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
            نسخ وإنشاء
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/admin/settings/roles/${id}`}>إلغاء</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
