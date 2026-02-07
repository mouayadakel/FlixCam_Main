/**
 * @file page.tsx
 * @description Roles list from DB with create, view, edit, clone, delete
 * @module app/admin/(routes)/settings/roles
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, Plus, Eye, Edit, Copy, Trash2, Users, RefreshCw, UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { RoleBadge } from '@/components/admin/roles/role-badge'
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

interface Role {
  id: string
  name: string
  displayName: string
  displayNameAr: string | null
  description: string | null
  isSystem: boolean
  color: string | null
  permissionCount: number
  userCount: number
}

export default function RolesPage() {
  const { toast } = useToast()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'system' | 'custom'>('all')
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadRoles()
  }, [filter])

  const loadRoles = async () => {
    setLoading(true)
    try {
      const params = filter === 'all' ? '' : `?isSystem=${filter === 'system'}`
      const response = await fetch(`/api/admin/roles${params}`)
      if (!response.ok) throw new Error('Failed to load roles')
      const data = await response.json()
      setRoles(data.data || [])
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل تحميل الأدوار',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/roles/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل الحذف')
      toast({ title: 'تم الحذف', description: 'تم حذف الدور بنجاح' })
      setDeleteTarget(null)
      loadRoles()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل الحذف',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const filteredRoles = roles

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8" />
            الأدوار والصلاحيات
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadRoles}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Button asChild>
            <Link href="/admin/settings/roles/new">
              <Plus className="h-4 w-4 ml-2" />
              دور جديد
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          الكل
        </Button>
        <Button
          variant={filter === 'system' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('system')}
        >
          نظام
        </Button>
        <Button
          variant={filter === 'custom' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('custom')}
        >
          مخصص
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الأدوار</p>
                <p className="text-2xl font-bold">{roles.length}</p>
              </div>
              <Shield className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">أدوار النظام</p>
                <p className="text-2xl font-bold">{roles.filter((r) => r.isSystem).length}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">أدوار مخصصة</p>
                <p className="text-2xl font-bold">{roles.filter((r) => !r.isSystem).length}</p>
              </div>
              <Users className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الأدوار</CardTitle>
          <CardDescription>إدارة أدوار المستخدمين وصلاحياتهم</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الدور</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الصلاحيات</TableHead>
                  <TableHead>المستخدمون</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="space-y-2 py-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRoles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      لا توجد أدوار
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <RoleBadge
                          name={role.name}
                          displayName={role.displayName}
                          displayNameAr={role.displayNameAr}
                          color={role.color}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {role.description || '-'}
                      </TableCell>
                      <TableCell>{role.permissionCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {role.userCount}
                          </span>
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`/admin/settings/roles/${role.id}/users`}
                              title="ربط مستخدم"
                            >
                              <UserPlus className="h-4 w-4 ml-1" />
                              ربط مستخدم
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {role.isSystem ? (
                          <Badge variant="secondary">نظام</Badge>
                        ) : (
                          <Badge variant="outline">مخصص</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/settings/roles/${role.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/settings/roles/${role.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/settings/roles/${role.id}/clone`} title="نسخ الدور">
                              <Copy className="h-4 w-4" />
                            </Link>
                          </Button>
                          {!role.isSystem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(role)}
                              disabled={role.userCount > 0}
                              title={role.userCount > 0 ? 'لا يمكن حذف دور به مستخدمون' : 'حذف'}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
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

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الدور</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الدور &quot;{deleteTarget?.displayNameAr || deleteTarget?.displayName}&quot;؟
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">
              {deleting ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
