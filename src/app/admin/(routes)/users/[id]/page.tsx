/**
 * @file page.tsx
 * @description User detail with Roles, Permission Overrides, Effective Permissions
 * @module app/admin/(routes)/users/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, UserPlus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { RoleBadge } from '@/components/admin/roles/role-badge'
import { AssignRoleModal } from '@/components/admin/users/assign-role-modal'

interface UserDetail {
  id: string
  email: string
  name: string | null
  role: string
  phone: string | null
  twoFactorEnabled: boolean
  createdAt: string
  customPermissions?: Array<{ id: string; name: string; description?: string }>
}

interface AssignedRole {
  id: string
  roleId: string
  role: {
    id: string
    name: string
    displayName: string
    displayNameAr: string | null
    color: string | null
  }
  isPrimary: boolean
  assignedAt: string
  expiresAt: string | null
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [roles, setRoles] = useState<AssignedRole[]>([])
  const [effectivePerms, setEffectivePerms] = useState<string[]>([])
  const [showEffectivePerms, setShowEffectivePerms] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const id = params?.id as string

  const loadUser = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [userRes, rolesRes, permsRes] = await Promise.all([
        fetch(`/api/admin/users/${id}`),
        fetch(`/api/admin/users/${id}/roles`),
        fetch(`/api/admin/users/${id}/effective-permissions`),
      ])
      if (userRes.ok) {
        const u = await userRes.json()
        setUser(u.data ?? null)
      }
      if (rolesRes.ok) {
        const r = await rolesRes.json()
        setRoles(r.data ?? [])
      }
      if (permsRes.ok) {
        const p = await permsRes.json()
        setEffectivePerms(p.data?.permissions ?? [])
      }
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل تحميل البيانات', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) loadUser()
  }, [id])

  const handleRemoveRole = async (roleId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/roles/${roleId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('فشل إزالة الدور')
      toast({ title: 'تم الإزالة', description: 'تم إزالة الدور بنجاح' })
      loadUser()
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل إزالة الدور', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[280px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">لم يتم العثور على المستخدم.</p>
        <Button variant="outline" asChild>
          <Link href="/admin/users">العودة</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/users" className="hover:text-foreground">المستخدمون</Link>
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        <span>{user.name || user.email}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات المستخدم</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><span className="font-medium">الاسم:</span> {user.name || '-'}</p>
          <p><span className="font-medium">البريد:</span> {user.email}</p>
          <p><span className="font-medium">الدور (legacy):</span> {user.role}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>الأدوار</CardTitle>
              <CardDescription>الأدوار المعيّنة لهذا المستخدم</CardDescription>
            </div>
            <Button size="sm" onClick={() => setAssignModalOpen(true)}>
              <UserPlus className="h-4 w-4 ml-2" />
              تعيين دور
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <p className="text-muted-foreground">لا توجد أدوار معيّنة</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {roles.map((ur) => (
                <div
                  key={ur.id}
                  className="flex items-center gap-1 rounded-md border px-2 py-1"
                >
                  <RoleBadge
                    name={ur.role.name}
                    displayName={ur.role.displayName}
                    displayNameAr={ur.role.displayNameAr}
                    color={ur.role.color}
                  />
                  {ur.isPrimary && (
                    <Badge variant="secondary" className="text-xs">أساسي</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleRemoveRole(ur.roleId)}
                    title="إزالة الدور"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الصلاحيات الفعّالة</CardTitle>
          <CardDescription>
            اتحاد الصلاحيات من جميع الأدوار والتداخلات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEffectivePerms(!showEffectivePerms)}
          >
            {showEffectivePerms ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            {showEffectivePerms ? 'إخفاء' : 'عرض'} ({effectivePerms.length})
          </Button>
          {showEffectivePerms && (
            <div className="flex flex-wrap gap-1 mt-2">
              {effectivePerms.map((p) => (
                <Badge key={p} variant="outline" className="font-mono text-xs">
                  {p}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AssignRoleModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        userId={id}
        currentRoleIds={roles.map((r) => r.roleId)}
        onSuccess={loadUser}
      />

      <Button variant="outline" asChild>
        <Link href="/admin/users">العودة</Link>
      </Button>
    </div>
  )
}
