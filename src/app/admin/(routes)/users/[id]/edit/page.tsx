/**
 * @file page.tsx
 * @description Edit user form – PATCH /api/admin/users/[id]
 * @module app/admin/(routes)/users/[id]/edit
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ROLES, USER_STATUS_OPTIONS } from '@/lib/constants/user.constants'

interface UserEdit {
  id: string
  email: string
  name: string | null
  role: string
  phone: string | null
  status?: string
  twoFactorEnabled: boolean
}

export default function EditUserPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<UserEdit | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<string>('')
  const [status, setStatus] = useState<string>('ACTIVE')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/admin/users/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('فشل تحميل المستخدم')
        return res.json()
      })
      .then((json) => {
        const u = json.data ?? json
        setUser(u)
        setName(u.name ?? '')
        setPhone(u.phone ?? '')
        setRole(u.role ?? '')
        setStatus(u.status ?? 'ACTIVE')
        setTwoFactorEnabled(u.twoFactorEnabled ?? false)
      })
      .catch(() => {
        toast({ title: 'خطأ', description: 'فشل تحميل المستخدم', variant: 'destructive' })
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !user) return
    if (!role) {
      toast({ title: 'خطأ', description: 'الدور مطلوب', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
          status: status as 'PENDING' | 'ACTIVE' | 'LOCKED',
          twoFactorEnabled,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'فشل تحديث المستخدم')
      }
      toast({ title: 'تم', description: 'تم تحديث المستخدم بنجاح' })
      router.push(`/admin/users/${id}`)
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل تحديث المستخدم',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">تعديل المستخدم</h1>
          <p className="mt-1 text-muted-foreground">
            المستخدمون <ArrowRight className="inline h-4 w-4 rtl:rotate-180" />{' '}
            {user.name || user.email} <ArrowRight className="inline h-4 w-4 rtl:rotate-180" /> تعديل
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/admin/users/${id}`}>
            <ArrowRight className="ms-2 h-4 w-4" />
            العودة
          </Link>
        </Button>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>بيانات المستخدم</CardTitle>
          <CardDescription>تعديل معلومات المستخدم. البريد الإلكتروني لا يمكن تغييره من هنا.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="max-w-md bg-muted"
              />
              <p className="text-xs text-muted-foreground">لا يمكن تغيير البريد الإلكتروني</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">الاسم</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم الكامل"
                className="max-w-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">الهاتف</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966..."
                className="max-w-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">الدور *</Label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger id="role" className="max-w-md">
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">الحالة</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="max-w-md">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  {USER_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 space-y-2">
              <Switch
                id="twoFactorEnabled"
                checked={twoFactorEnabled}
                onCheckedChange={setTwoFactorEnabled}
              />
              <Label htmlFor="twoFactorEnabled" className="cursor-pointer">
                المصادقة الثنائية (2FA)
              </Label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                حفظ
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/admin/users/${id}`}>إلغاء</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
