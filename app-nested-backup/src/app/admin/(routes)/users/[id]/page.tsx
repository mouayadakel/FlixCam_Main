/**
 * @file page.tsx
 * @description User detail with Roles, Permission Overrides, Effective Permissions
 * @module app/admin/(routes)/users/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  Loader2,
  UserPlus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Shield,
  Bell,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { RoleBadge } from '@/components/admin/roles/role-badge'
import { AssignRoleModal } from '@/components/admin/users/assign-role-modal'
import { formatDateTime } from '@/lib/utils/format.utils'

interface AuditLogEntry {
  id: string
  action: string
  resourceType: string | null
  resourceId: string | null
  description: string | null
  createdAt: string
}

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
  const [activityLogs, setActivityLogs] = useState<AuditLogEntry[]>([])
  const [showActivity, setShowActivity] = useState(false)

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
      // Load activity logs
      try {
        const logsRes = await fetch(`/api/audit-logs?userId=${id}&limit=20`)
        if (logsRes.ok) {
          const l = await logsRes.json()
          setActivityLogs(l.logs ?? l.data ?? [])
        }
      } catch {
        /* non-critical */
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
      <div className="flex min-h-[280px] items-center justify-center">
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
        <Link href="/admin/users" className="hover:text-foreground">
          المستخدمون
        </Link>
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        <span>{user.name || user.email}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات المستخدم</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">الاسم</p>
              <p className="font-medium">{user.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">البريد</p>
              <p className="font-medium" dir="ltr">
                {user.email}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الهاتف</p>
              <p className="font-medium" dir="ltr">
                {user.phone || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الدور</p>
              <Badge variant="outline">{user.role}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">المصادقة الثنائية</p>
              <Badge variant={user.twoFactorEnabled ? 'default' : 'secondary'}>
                <Shield className="ms-1 h-3 w-3" />
                {user.twoFactorEnabled ? 'مفعّلة' : 'غير مفعّلة'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">تاريخ الإنشاء</p>
              <p className="font-medium">{formatDateTime(user.createdAt)}</p>
            </div>
          </div>
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
              <UserPlus className="ms-2 h-4 w-4" />
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
                <div key={ur.id} className="flex items-center gap-1 rounded-md border px-2 py-1">
                  <RoleBadge
                    name={ur.role.name}
                    displayName={ur.role.displayName}
                    displayNameAr={ur.role.displayNameAr}
                    color={ur.role.color}
                  />
                  {ur.isPrimary && (
                    <Badge variant="secondary" className="text-xs">
                      أساسي
                    </Badge>
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
          <CardDescription>اتحاد الصلاحيات من جميع الأدوار والتداخلات</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEffectivePerms(!showEffectivePerms)}
          >
            {showEffectivePerms ? (
              <ChevronUp className="ms-2 h-4 w-4" />
            ) : (
              <ChevronDown className="ms-2 h-4 w-4" />
            )}
            {showEffectivePerms ? 'إخفاء' : 'عرض'} ({effectivePerms.length})
          </Button>
          {showEffectivePerms && (
            <div className="mt-2 flex flex-wrap gap-1">
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

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                سجل النشاط
              </CardTitle>
              <CardDescription>آخر 20 إجراء لهذا المستخدم</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowActivity(!showActivity)}>
              {showActivity ? (
                <ChevronUp className="ms-2 h-4 w-4" />
              ) : (
                <ChevronDown className="ms-2 h-4 w-4" />
              )}
              {showActivity ? 'إخفاء' : 'عرض'} ({activityLogs.length})
            </Button>
          </div>
        </CardHeader>
        {showActivity && (
          <CardContent>
            {activityLogs.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">لا توجد سجلات</p>
            ) : (
              <div className="space-y-2">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {log.action}
                        </Badge>
                        {log.resourceType && (
                          <Badge variant="secondary" className="text-xs">
                            {log.resourceType}
                          </Badge>
                        )}
                      </div>
                      {log.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{log.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Button variant="outline" asChild>
        <Link href="/admin/users">العودة</Link>
      </Button>
    </div>
  )
}
