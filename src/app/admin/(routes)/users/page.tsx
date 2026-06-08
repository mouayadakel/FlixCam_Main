/**
 * @file page.tsx
 * @description Users list page – wired to GET /api/admin/users
 * @module app/admin/(routes)/users
 */

'use client'

import { useState, useEffect } from 'react'
import { EMBED_LTR } from '@/lib/i18n/bidi'
import { TableFilters } from '@/components/tables/table-filters'
import { TablePagination } from '@/components/tables/table-pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils/format.utils'
import { USER_STATUS_LABELS } from '@/lib/constants/user.constants'
import { Eye, Loader2, RefreshCw, AlertCircle, Plus, Shield, MoreHorizontal, Pencil, Trash2, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface UserRow {
  id: string
  name: string | null
  email: string
  role: string
  phone: string | null
  status?: string
  twoFactorEnabled?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export default function UsersPage() {
  const { toast } = useToast()
  const [data, setData] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [hardDeleteTarget, setHardDeleteTarget] = useState<UserRow | null>(null)
  const [hardDeleteConfirmPhrase, setHardDeleteConfirmPhrase] = useState('')
  const [restoreTarget, setRestoreTarget] = useState<UserRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [hardDeleting, setHardDeleting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const isDeactivatedView = statusFilter === 'DEACTIVATED'

  const HARD_DELETE_PHRASES = ['حذف', 'delete']
  const isHardDeleteConfirmed =
    hardDeleteTarget !== null &&
    HARD_DELETE_PHRASES.includes(hardDeleteConfirmPhrase.trim().toLowerCase())

  useEffect(() => {
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => user?.id && setCurrentUserId(user.id))
      .catch(() => {})
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      if (search) params.set('search', search)
      if (isDeactivatedView) {
        params.set('deleted', 'true')
      } else {
        if (statusFilter && statusFilter !== 'All') params.set('status', statusFilter)
      }
      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load users')
      }
      const json = await res.json()
      setData(Array.isArray(json.data) ? json.data : [])
      setTotal(json.meta?.total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل تحميل المستخدمين')
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, pageSize, statusFilter])

  const handleDeleteUser = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'فشل تعطيل المستخدم')
      }
      toast({ title: 'تم التعطيل', description: 'تم تعطيل الحساب بنجاح' })
      setDeleteTarget(null)
      fetchUsers()
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
    if (!restoreTarget) return
    setRestoring(true)
    try {
      const res = await fetch(`/api/admin/users/${restoreTarget.id}/restore`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'فشل تفعيل الحساب')
      }
      toast({ title: 'تم التفعيل', description: 'تم تفعيل الحساب بنجاح' })
      setRestoreTarget(null)
      fetchUsers()
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
    if (!hardDeleteTarget || !isHardDeleteConfirmed) return
    setHardDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${hardDeleteTarget.id}/permanent`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'فشل الحذف النهائي')
      }
      toast({ title: 'تم الحذف النهائي', description: 'تم حذف المستخدم نهائياً' })
      setHardDeleteTarget(null)
      setHardDeleteConfirmPhrase('')
      fetchUsers()
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

  const statuses = ['All', 'ACTIVE', 'LOCKED', 'PENDING', 'DEACTIVATED']

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">المستخدمون</h1>
          <p className="mt-1 text-muted-foreground">إدارة الحسابات والأدوار</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/settings/roles">
              <Shield className="ms-2 h-4 w-4" />
              الأدوار والصلاحيات
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/users/new">
              <Plus className="ms-2 h-4 w-4" />
              مستخدم جديد
            </Link>
          </Button>
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`ms-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      <TableFilters
        searchPlaceholder="البحث بالمستخدمين..."
        statusOptions={statuses}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-red-800">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchUsers}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>البريد</TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead>الدور</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>2FA</TableHead>
              <TableHead>تاريخ الإنشاء</TableHead>
              <TableHead className="text-end">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">جاري التحميل...</p>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  لا يوجد مستخدمون
                </TableCell>
              </TableRow>
            ) : (
              data.map((user) => {
                const isDeactivated = !!user.deletedAt
                const statusInfo = isDeactivated
                  ? USER_STATUS_LABELS.DEACTIVATED
                  : (USER_STATUS_LABELS[(user.status as keyof typeof USER_STATUS_LABELS) ?? 'ACTIVE'] ?? USER_STATUS_LABELS.ACTIVE)
                const isCurrentUser = user.id === currentUserId
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name ?? '—'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone ?? '—'}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>{statusInfo.ar}</Badge>
                    </TableCell>
                    <TableCell>{user.twoFactorEnabled ? 'نعم' : '—'}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">إجراءات</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/users/${user.id}`}>
                              <Eye className="ms-2 h-4 w-4" />
                              عرض
                            </Link>
                          </DropdownMenuItem>
                          {!isDeactivatedView ? (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/users/${user.id}/edit`}>
                                  <Pencil className="ms-2 h-4 w-4" />
                                  تعديل
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={isCurrentUser}
                                onClick={() => setDeleteTarget(user)}
                              >
                                <Trash2 className="ms-2 h-4 w-4" />
                                تعطيل
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={isCurrentUser}
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setHardDeleteTarget(user)
                                  setHardDeleteConfirmPhrase('')
                                }}
                              >
                                <Trash2 className="ms-2 h-4 w-4" />
                                حذف نهائي
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => setRestoreTarget(user)}>
                                <RotateCcw className="ms-2 h-4 w-4" />
                                تفعيل
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={isCurrentUser}
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setHardDeleteTarget(user)
                                  setHardDeleteConfirmPhrase('')
                                }}
                              >
                                <Trash2 className="ms-2 h-4 w-4" />
                                حذف نهائي
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          itemLabel="مستخدم"
          dir="rtl"
        />
      )}

      <AlertDialog
        open={restoreTarget !== null}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
      >
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

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم تعطيل الحساب ولن يتمكن المستخدم من تسجيل الدخول. يمكن استعادة الحساب لاحقاً إذا لزم
              الأمر.
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
        open={hardDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setHardDeleteTarget(null)
            setHardDeleteConfirmPhrase('')
          }
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
            <Label htmlFor="hard-delete-confirm-list">التأكيد</Label>
            <Input
              id="hard-delete-confirm-list"
              value={hardDeleteConfirmPhrase}
              onChange={(e) => setHardDeleteConfirmPhrase(e.target.value)}
              placeholder="حذف أو DELETE"
              className="max-w-xs"
              dir={EMBED_LTR}
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
    </div>
  )
}
