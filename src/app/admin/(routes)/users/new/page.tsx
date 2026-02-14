/**
 * @file page.tsx
 * @description Create user form – POST /api/admin/users
 * @module app/admin/(routes)/users/new
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

const ROLES: { value: string; label: string }[] = [
  { value: 'ADMIN', label: 'مدير' },
  { value: 'SALES_MANAGER', label: 'مدير المبيعات' },
  { value: 'ACCOUNTANT', label: 'محاسب' },
  { value: 'WAREHOUSE_MANAGER', label: 'مدير المستودع' },
  { value: 'TECHNICIAN', label: 'فني' },
  { value: 'CUSTOMER_SERVICE', label: 'خدمة العملاء' },
  { value: 'MARKETING_MANAGER', label: 'مدير التسويق' },
  { value: 'RISK_MANAGER', label: 'مدير المخاطر' },
  { value: 'APPROVAL_AGENT', label: 'موافق' },
  { value: 'AUDITOR', label: 'مدقق' },
  { value: 'AI_OPERATOR', label: 'مشغل الذكاء الاصطناعي' },
  { value: 'DATA_ENTRY', label: 'إدخال البيانات' },
]

export default function NewUserPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>('')
  const [phone, setPhone] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast({ title: 'خطأ', description: 'البريد الإلكتروني مطلوب', variant: 'destructive' })
      return
    }
    if (!role) {
      toast({ title: 'خطأ', description: 'الدور مطلوب', variant: 'destructive' })
      return
    }
    if (password && password.length < 8) {
      toast({ title: 'خطأ', description: 'كلمة المرور 8 أحرف على الأقل', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          password: password || undefined,
          role,
          phone: phone.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'فشل إنشاء المستخدم')
      }
      toast({ title: 'تم', description: 'تم إنشاء المستخدم بنجاح' })
      router.push('/admin/users')
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل إنشاء المستخدم',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">مستخدم جديد</h1>
          <p className="text-muted-foreground mt-1">إضافة مستخدم إلى المنصة</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/users">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Link>
        </Button>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>بيانات المستخدم</CardTitle>
          <CardDescription>البريد الإلكتروني والدور مطلوبان. كلمة المرور اختيارية (يُولَّد تلقائياً إن تُركت فارغة).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="max-w-md"
              />
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
              <Label htmlFor="password">كلمة المرور (اختياري)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 أحرف على الأقل - اترك فارغاً لإنشاء كلمة عشوائية"
                minLength={8}
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
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                إنشاء مستخدم
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/users">إلغاء</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
