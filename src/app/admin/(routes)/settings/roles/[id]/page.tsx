/**
 * @file page.tsx
 * @description Role detail – real data from API, auth-aware
 * @module app/admin/(routes)/settings/roles/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, Shield, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

interface RoleDetail {
  id: string
  name: string
  description: string
  permissions: string[]
  userCount: number
  users: Array<{
    id: string
    email: string
    name: string | null
    createdAt: string
  }>
}

export default function RoleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [role, setRole] = useState<RoleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  const id = params?.id as string

  useEffect(() => {
    if (id) loadRole()
  }, [id])

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
      setRole(data.data ?? null)
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
        <span>{role.name}</span>
      </div>

      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">{role.name}</h1>
          <p className="text-muted-foreground">{role.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الصلاحيات</CardTitle>
          <CardDescription>
            {role.permissions.length} صلاحية معرّفة لهذا الدور (للقراءة فقط — أدوار النظام لا تُعدّل من الواجهة)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {role.permissions.map((perm) => (
              <Badge key={perm} variant="secondary" className="font-mono text-xs">
                {perm}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المستخدمون</CardTitle>
          <CardDescription>
            المستخدمون المعيّنون لهذا الدور ({role.userCount} عرض حتى 100)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد</TableHead>
                  <TableHead>تاريخ الانضمام</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!role.users?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      لا مستخدمين معيّنين لهذا الدور
                    </TableCell>
                  </TableRow>
                ) : (
                  role.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name ?? '—'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell className="text-left">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/clients/${user.id}`}>
                            <User className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div>
        <Button variant="outline" asChild>
          <Link href="/admin/settings/roles">العودة إلى قائمة الأدوار</Link>
        </Button>
      </div>
    </div>
  )
}
