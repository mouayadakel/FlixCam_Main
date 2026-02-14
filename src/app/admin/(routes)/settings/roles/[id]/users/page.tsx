/**
 * @file page.tsx
 * @description Manage users assigned to a role – assign and remove
 * @module app/admin/(routes)/settings/roles/[id]/users
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, UserPlus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { AssignUserToRoleModal } from '@/components/admin/roles/assign-user-to-role-modal'
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

interface RoleInfo {
  id: string
  displayName: string
  displayNameAr: string | null
}

interface AssignedUser {
  id: string
  email: string
  name: string | null
  assignedAt: string
  isPrimary: boolean
  assignedUserRoleId: string
}

export default function RoleUsersPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const id = params?.id as string
  const [role, setRole] = useState<RoleInfo | null>(null)
  const [users, setUsers] = useState<AssignedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<AssignedUser | null>(null)
  const [removing, setRemoving] = useState(false)

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/roles/${id}/users`)
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      if (res.status === 403) {
        toast({ title: 'غير مصرح', description: 'ليس لديك صلاحية', variant: 'destructive' })
        return
      }
      if (res.status === 404) {
        toast({ title: 'غير موجود', description: 'الدور غير موجود', variant: 'destructive' })
        router.push('/admin/settings/roles')
        return
      }
      if (!res.ok) throw new Error('فشل تحميل البيانات')
      const data = await res.json()
      setRole(data.data?.role ?? null)
      setUsers(data.data?.users ?? [])
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل المستخدمين',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoving(true)
    try {
      const res = await fetch(`/api/admin/users/${removeTarget.id}/roles/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل إزالة الدور')
      toast({ title: 'تم الإزالة', description: 'تم إزالة المستخدم من الدور' })
      setRemoveTarget(null)
      loadData()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل إزالة الدور',
        variant: 'destructive',
      })
    } finally {
      setRemoving(false)
    }
  }

  const roleName = role?.displayNameAr || role?.displayName || ''

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/settings/roles" className="hover:text-foreground">
          الأدوار والصلاحيات
        </Link>
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        <Link href={`/admin/settings/roles/${id}`} className="hover:text-foreground">
          {roleName || '...'}
        </Link>
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        <span>المستخدمون</span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>مستخدمو الدور: {roleName || '...'}</CardTitle>
              <CardDescription>
                إدارة المستخدمين المعيّنين لهذا الدور. يمكنك إضافة أو إزالة المستخدمين.
              </CardDescription>
            </div>
            <Button onClick={() => setAssignModalOpen(true)}>
              <UserPlus className="h-4 w-4 ml-2" />
              ربط مستخدم
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>البريد الإلكتروني</TableHead>
                    <TableHead>تاريخ التعيين</TableHead>
                    <TableHead>دور أساسي</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        لا يوجد مستخدمون معيّنون لهذا الدور. اضغط &quot;ربط مستخدم&quot; للإضافة.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name || '-'}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{formatDate(u.assignedAt)}</TableCell>
                        <TableCell>{u.isPrimary ? 'نعم' : '-'}</TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/admin/users/${u.id}`}>عرض</Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRemoveTarget(u)}
                              className="text-destructive hover:text-destructive"
                              aria-label="إزالة من الدور"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href={`/admin/settings/roles/${id}`}>العودة إلى تفاصيل الدور</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/settings/roles">العودة إلى قائمة الأدوار</Link>
        </Button>
      </div>

      <AssignUserToRoleModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        roleId={id}
        roleName={roleName}
        assignedUserIds={users.map((u) => u.id)}
        onSuccess={loadData}
      />

      <AlertDialog open={!!removeTarget} onOpenChange={() => !removing && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إزالة المستخدم من الدور</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إزالة &quot;{removeTarget?.name || removeTarget?.email}&quot; من الدور &quot;{roleName}&quot;؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-destructive text-destructive-foreground"
            >
              {removing ? 'جاري الإزالة...' : 'إزالة'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
