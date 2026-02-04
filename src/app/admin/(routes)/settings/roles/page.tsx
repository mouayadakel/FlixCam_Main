/**
 * @file page.tsx
 * @description Roles & Permissions page with real data
 * @module app/admin/(routes)/settings/roles
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, Plus, Eye, Edit, Users, RefreshCw } from 'lucide-react'
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

interface Role {
  id: string
  name: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  _count?: {
    users: number
  }
  createdAt: string
}

/** Badge colors for role IDs (all 12 predefined roles) */
const ROLE_LABELS: Record<string, { ar: string; color: string }> = {
  ADMIN: { ar: 'مدير النظام', color: 'bg-red-100 text-red-800' },
  SALES_MANAGER: { ar: 'مدير المبيعات', color: 'bg-blue-100 text-blue-800' },
  ACCOUNTANT: { ar: 'محاسب', color: 'bg-orange-100 text-orange-800' },
  WAREHOUSE_MANAGER: { ar: 'مدير المستودع', color: 'bg-green-100 text-green-800' },
  TECHNICIAN: { ar: 'فني', color: 'bg-yellow-100 text-yellow-800' },
  CUSTOMER_SERVICE: { ar: 'خدمة العملاء', color: 'bg-cyan-100 text-cyan-800' },
  MARKETING_MANAGER: { ar: 'مدير التسويق', color: 'bg-purple-100 text-purple-800' },
  RISK_MANAGER: { ar: 'مدير المخاطر', color: 'bg-amber-100 text-amber-800' },
  APPROVAL_AGENT: { ar: 'وكيل الموافقات', color: 'bg-indigo-100 text-indigo-800' },
  AUDITOR: { ar: 'مراجع', color: 'bg-slate-100 text-slate-800' },
  AI_OPERATOR: { ar: 'مشغّل الذكاء الاصطناعي', color: 'bg-violet-100 text-violet-800' },
  DATA_ENTRY: { ar: 'إدخال البيانات', color: 'bg-gray-100 text-gray-800' },
}

export default function RolesPage() {
  const { toast } = useToast()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/roles')
      if (!response.ok) {
        throw new Error('Failed to load roles')
      }
      const data = await response.json()
      const transformedRoles = (data.data || []).map((role: { id: string; name: string; description: string | null; userCount: number; permissions?: string[] }) => ({
        id: role.id,
        name: role.name ?? role.id,
        description: role.description ?? null,
        permissions: role.permissions ?? [],
        isSystem: true,
        _count: { users: role.userCount ?? 0 },
        createdAt: new Date().toISOString(),
      }))
      setRoles(transformedRoles)
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

  const getRoleColor = (roleId: string) => {
    return ROLE_LABELS[roleId]?.color ?? 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
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
          <Button disabled title="الأدوار المخصصة غير مدعومة حالياً">
            <Plus className="h-4 w-4 ml-2" />
            دور جديد
          </Button>
        </div>
      </div>

      {/* Stats */}
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
                <p className="text-2xl font-bold">{roles.filter(r => r.isSystem).length}</p>
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
                <p className="text-2xl font-bold">{roles.filter(r => !r.isSystem).length}</p>
              </div>
              <Users className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roles Table */}
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
                ) : roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      لا توجد أدوار
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <Badge className={getRoleColor(role.id)}>
                          {role.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {role.description || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.slice(0, 3).map((perm, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                          {role.permissions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{role.permissions.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {role._count?.users || 0}
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
                          {!role.isSystem && (
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/admin/settings/roles/${role.id}/edit`}>
                                <Edit className="h-4 w-4" />
                              </Link>
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
    </div>
  )
}
