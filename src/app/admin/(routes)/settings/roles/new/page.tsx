/**
 * @file page.tsx
 * @description Create new custom role
 * @module app/admin/(routes)/settings/roles/new
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { PermissionMatrix } from '@/components/admin/roles/permission-matrix'

interface Category {
  id: string
  name: string
  nameAr: string | null
  sortOrder: number
  permissions: Array<{
    id: string
    name: string
    description: string | null
    descriptionAr: string | null
    isSystem: boolean
    sortOrder: number
  }>
}

export default function NewRolePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    displayName: '',
    displayNameAr: '',
    description: '',
    color: '',
  })
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/admin/permissions')
      .then((r) => r.json())
      .then((data) => setCategories(data.data || []))
      .catch(() =>
        toast({ title: 'خطأ', description: 'فشل تحميل الصلاحيات', variant: 'destructive' })
      )
      .finally(() => setLoading(false))
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.displayName.trim()) {
      toast({
        title: 'بيانات ناقصة',
        description: 'الاسم واسم العرض مطلوبان',
        variant: 'destructive',
      })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim().toLowerCase().replace(/\s+/g, '_'),
          displayName: form.displayName.trim(),
          displayNameAr: form.displayNameAr.trim() || undefined,
          description: form.description.trim() || undefined,
          color: form.color.trim() || undefined,
          permissionIds: Array.from(selectedPermissionIds),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل الإنشاء')
      toast({ title: 'تم الإنشاء', description: 'تم إنشاء الدور بنجاح' })
      router.push(`/admin/settings/roles/${data.data?.id}`)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل إنشاء الدور',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/settings/roles" className="hover:text-foreground">
          الأدوار والصلاحيات
        </Link>
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        <span>دور جديد</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              تفاصيل الدور
            </CardTitle>
            <CardDescription>أدخل بيانات الدور الجديد</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">الاسم (معرّف، لاتيني)</Label>
                <Input
                  id="name"
                  placeholder="custom_role"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="displayName">اسم العرض</Label>
                <Input
                  id="displayName"
                  placeholder="دور مخصص"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="displayNameAr">اسم العرض (عربي)</Label>
                <Input
                  id="displayNameAr"
                  placeholder="دور مخصص"
                  value={form.displayNameAr}
                  onChange={(e) => setForm((f) => ({ ...f, displayNameAr: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="color">اللون (hex)</Label>
                <Input
                  id="color"
                  type="text"
                  placeholder="#3b82f6"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">الوصف</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الصلاحيات</CardTitle>
            <CardDescription>اختر الصلاحيات الممنوحة لهذا الدور</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">جاري التحميل...</div>
            ) : (
              <PermissionMatrix
                categories={categories}
                selectedPermissionIds={selectedPermissionIds}
                onSelectionChange={setSelectedPermissionIds}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
            حفظ
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/settings/roles">إلغاء</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
