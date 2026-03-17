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
  Pencil,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { USER_STATUS_LABELS } from '@/lib/constants/user.constants'
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
  status?: string
  twoFactorEnabled: boolean
  createdAt: string
  updatedAt?: string
  deletedAt?: string | null
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [hardDeleteConfirmPhrase, setHardDeleteConfirmPhrase] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [hardDeleting, setHardDeleting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const HARD_DELETE_PHRASES = ['حذف', 'delete']
  const isHardDeleteConfirmed =
    HARD_DELETE_PHRASES.includes(hardDeleteConfirmPhrase.trim().toLowerCase())

  const id = params?.id as string

  useEffect(() => {
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((u) => u?.id && setCurrentUserId(u.id))
      .catch(() => {})
  }, [])

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

  const handleDeleteUser = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'فشل تعطيل المستخدم')
      }
      toast({ title: 'تم التعطيل', description: 'تم تعطيل الحساب بنجاح' })
      setDeleteDialogOpen(false)
      router.push('/admin/users')
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل تعطيل المستخدم',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleRestoreUser = async () => {
    setRestoring(true)
    try {
      const res = await fetch(`/api/admin/users/${id}/restore`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'فشل تفعيل الحساب')
      }
      toast({ title: 'تم التفعيل', description: 'تم تفعيل الحساب بنجاح' })
      setRestoreDialogOpen(false)
      loadUser()
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل تفعيل الحساب',
        variant: 'destructive',
      })
    } finally {
      setRestoring(false)
    }
  }

  const handleHardDeleteUser = async () => {
    if (!isHardDeleteConfirmed) return
    setHardDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${id}/permanent`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'فشل الحذف النهائي')
      }
      toast({ title: 'تم الحذف النهائي', description: 'تم حذف المستخدم نهائياً' })
      setHardDeleteDialogOpen(false)
      setHardDeleteConfirmPhrase('')
      router.push('/admin/users')
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل الحذف النهائي',
        variant: 'destructive',
      })
    } finally {
      setHardDeleting(false)
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

  const isDeactivated = !!user.deletedAt
  const statusInfo = isDeactivated
    ? USER_STATUS_LABELS.DEACTIVATED
    : (USER_STATUS_LABELS[user.status ?? 'ACTIVE'] ?? USER_STATUS_LABELS.ACTIVE)
  const isCurrentUser = user.id === currentUserId

  return (
    <div className="space-y-6" dir="rtl">
      {isDeactivated && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            هذا الحساب معطل. يمكنك تفعيله أو حذفه نهائياً.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin/users" className="hover:text-foreground">
            المستخدمون
          </Link>
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          <span>{user.name || user.email}</span>
        </div>
        <div className="flex gap-2">
          {!isDeactivated && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/users/${id}/edit`}>
                  <Pencil className="ms-2 h-4 w-4" />
                  تعديل
                </Link>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isCurrentUser}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="ms-2 h-4 w-4" />
                تعطيل الحساب
              </Button>
            </>
          )}
          {isDeactivated && (
            <Button size="sm" onClick={() => setRestoreDialogOpen(true)}>
              <RotateCcw className="ms-2 h-4 w-4" />
              تفعيل الحساب
            </Button>
          )}
        </div>
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
              <p className="text-sm text-muted-foreground">الحالة</p>
              <Badge variant={statusInfo.variant}>{statusInfo.ar}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">تاريخ الإنشاء</p>
              <p className="font-medium">{formatDateTime(user.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">آخر تحديث</p>
              <p className="font-medium">
                {user.updatedAt ? formatDateTime(user.updatedAt) : '—'}
              </p>
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

      {/* Danger zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            منطقة الخطر
          </CardTitle>
          <CardDescription>
            {isDeactivated
              ? 'يمكنك تفعيل الحساب أو حذفه نهائياً.'
              : 'تعطيل الحساب يحفظ البيانات ويمكن استعادتها. الحذف النهائي لا يمكن التراجع عنه.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {!isDeactivated && (
            <Button
              variant="destructive"
              disabled={isCurrentUser}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="ms-2 h-4 w-4" />
              تعطيل الحساب
            </Button>
          )}
          {isDeactivated && (
            <Button onClick={() => setRestoreDialogOpen(true)}>
              <RotateCcw className="ms-2 h-4 w-4" />
              تفعيل الحساب
            </Button>
          )}
          <Button
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/10"
            disabled={isCurrentUser}
            onClick={() => {
              setHardDeleteConfirmPhrase('')
              setHardDeleteDialogOpen(true)
            }}
          >
            <Trash2 className="ms-2 h-4 w-4" />
            حذف نهائي
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تفعيل الحساب</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد تفعيل هذا الحساب؟ سيتمكن المستخدم من تسجيل الدخول مرة أخرى.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreUser} disabled={restoring}>
              {restoring ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
              تفعيل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم تعطيل الحساب ولن يتمكن المستخدم من تسجيل الدخول. يمكن استعادة الحساب لاحقاً إذا
              لزم الأمر.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
              تعطيل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={hardDeleteDialogOpen}
        onOpenChange={(open) => {
          setHardDeleteDialogOpen(open)
          if (!open) setHardDeleteConfirmPhrase('')
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف نهائي - لا يمكن التراجع</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. سيتم حذف المستخدم وبياناته نهائياً. اكتب "حذف" أو
              "DELETE" للتأكيد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="hard-delete-confirm">التأكيد</Label>
            <Input
              id="hard-delete-confirm"
              value={hardDeleteConfirmPhrase}
              onChange={(e) => setHardDeleteConfirmPhrase(e.target.value)}
              placeholder="حذف أو DELETE"
              className="max-w-xs"
              dir="ltr"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleHardDeleteUser}
              disabled={!isHardDeleteConfirmed || hardDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {hardDeleting ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button variant="outline" asChild>
        <Link href="/admin/users">العودة</Link>
      </Button>
    </div>
  )
}
