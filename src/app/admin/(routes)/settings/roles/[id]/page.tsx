/**
 * @file page.tsx
 * @description Role detail – view and edit (custom roles editable)
 * @module app/admin/(routes)/settings/roles/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, Shield, Save, UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils/format.utils'
import { RoleBadge } from '@/components/admin/roles/role-badge'
import { PermissionMatrix } from '@/components/admin/roles/permission-matrix'

interface RoleDetail {
  id: string
  name: string
  displayName: string
  displayNameAr: string | null
  description: string | null
  isSystem: boolean
  color: string | null
  rolePermissions: Array<{ permissionId: string; permission: { id: string; name: string } }>
  _count: { userRoles: number }
}

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
  }>
}

export default function RoleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [role, setRole] = useState<RoleDetail | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ displayName: '', displayNameAr: '', description: '', color: '' })
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set())

  const id = params?.id as string

  useEffect(() => {
    if (id) loadRole()
  }, [id])

  useEffect(() => {
    if (editMode) {
      fetch('/api/admin/permissions')
        .then((r) => r.json())
        .then((data) => setCategories(data.data || []))
        .catch(() => {})
    }
  }, [editMode])

  const loadRole = async () => {
    setLoading(true)
    setForbidden(false)
    try {
      const res = await fetch(`/api/admin/roles/${id}`)
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      if (res.status === 403) {
        setForbidden(true)
        setRole(null)
        return
      }
      if (res.status === 404) {
        toast({ title: 'غير موجود', description: 'الدور غير موجود', variant: 'destructive' })
        router.push('/admin/settings/roles')
        return
      }
      if (!res.ok) throw new Error('فشل تحميل الدور')
      const data = await res.json()
      const r = data.data ?? null
      setRole(r)
      if (r) {
        setForm({
          displayName: r.displayName ?? '',
          displayNameAr: r.displayNameAr ?? '',
          description: r.description ?? '',
          color: r.color ?? '',
        })
        setSelectedPermissionIds(
          new Set(r.rolePermissions?.map((rp: { permissionId: string }) => rp.permissionId) ?? [])
        )
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل تفاصيل الدور',
        variant: 'destructive',
      })
      setRole(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!role) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: form.displayName,
          displayNameAr: form.displayNameAr || undefined,
          description: form.description || undefined,
          color: form.color || undefined,
          permissionIds: Array.from(selectedPermissionIds),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل الحفظ')
      toast({ title: 'تم الحفظ', description: 'تم تحديث الدور بنجاح' })
      setEditMode(false)
      loadRole()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل الحفظ',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[280px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="space-y-4">
        <p className="text-destructive font-medium">ليس لديك صلاحية عرض الأدوار والصلاحيات.</p>
        <Button variant="outline" asChild>
          <Link href="/admin/settings/roles">العودة إلى الأدوار</Link>
        </Button>
      </div>
    )
  }

  if (!role) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">لم يتم العثور على الدور.</p>
        <Button variant="outline" asChild>
          <Link href="/admin/settings/roles">العودة إلى الأدوار</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/settings/roles" className="hover:text-foreground">الأدوار والصلاحيات</Link>
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        <span>{role.displayNameAr || role.displayName}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            {editMode ? (
              <div className="space-y-2">
                <Input
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="اسم العرض"
                />
                <Input
                  value={form.displayNameAr}
                  onChange={(e) => setForm((f) => ({ ...f, displayNameAr: e.target.value }))}
                  placeholder="اسم العرض (عربي)"
                />
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold">{role.displayNameAr || role.displayName}</h1>
                <p className="text-muted-foreground">{role.description || '-'}</p>
              </>
            )}
          </div>
        </div>
        {!role.isSystem && (
          editMode ? (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
                حفظ
              </Button>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                إلغاء
              </Button>
            </div>
          ) : (
            <Button onClick={() => setEditMode(true)}>تعديل</Button>
          )
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الصلاحيات</CardTitle>
          <CardDescription>
            {role.rolePermissions?.length ?? 0} صلاحية معرّفة لهذا الدور
            {role.isSystem && ' (للقراءة فقط — أدوار النظام لا تُعدّل من الواجهة)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editMode && !role.isSystem ? (
            <PermissionMatrix
              categories={categories}
              selectedPermissionIds={selectedPermissionIds}
              onSelectionChange={setSelectedPermissionIds}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {role.rolePermissions?.map((rp) => (
                <Badge key={rp.permissionId} variant="secondary" className="font-mono text-xs">
                  {rp.permission?.name ?? rp.permissionId}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>المستخدمون</CardTitle>
              <CardDescription>
                عدد المستخدمين المعيّنين لهذا الدور: {role._count?.userRoles ?? 0}
              </CardDescription>
            </div>
            <Button asChild>
              <Link href={`/admin/settings/roles/${role.id}/users`}>
                <UserPlus className="h-4 w-4 ml-2" />
                ربط مستخدم
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            لعرض وتعيين المستخدمين، استخدم صفحة إدارة المستخدمين.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/admin/settings/roles">العودة إلى قائمة الأدوار</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/admin/settings/roles/${role.id}/clone`}>نسخ الدور</Link>
        </Button>
      </div>
    </div>
  )
}
