/**
 * @file profile/page.tsx
 * @description Admin profile – personal info and password change
 * @module app/admin/(routes)/profile
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Loader2, User, Shield } from 'lucide-react'

interface UserProfile {
  id: string
  name: string | null
  email: string
  phone: string | null
}

export default function ProfilePage() {
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const res = await fetch('/api/me')
      if (!res.ok) throw new Error('Failed to load profile')
      const data = await res.json()
      setProfile(data)
    } catch {
      toast({
        title: 'خطأ',
        description: 'فشل تحميل الملف الشخصي',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name || undefined,
          phone: profile.phone ?? undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ التغييرات بنجاح',
      })
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل حفظ التغييرات',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور الجديدة غير متطابقة',
        variant: 'destructive',
      })
      return
    }
    if (newPassword.length < 8) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
        variant: 'destructive',
      })
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch('/api/user/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to change password')
      toast({
        title: 'تم التغيير',
        description: 'تم تغيير كلمة المرور بنجاح',
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل تغيير كلمة المرور',
        variant: 'destructive',
      })
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-[300px] items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">لم يتم العثور على الملف الشخصي</p>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold">الملف الشخصي</h1>
        <p className="mt-1 text-muted-foreground">إدارة معلوماتك الشخصية وكلمة المرور</p>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">
            <User className="ms-2 h-4 w-4" />
            المعلومات الشخصية
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="ms-2 h-4 w-4" />
            الأمان
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>المعلومات الشخصية</CardTitle>
              <CardDescription>تحديث اسمك ورقم الهاتف</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم</Label>
                <Input
                  id="name"
                  value={profile.name ?? ''}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="الاسم"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">لا يمكن تغيير البريد الإلكتروني</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone ?? ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value || null })}
                  placeholder="+966 5XX XXX XXXX"
                />
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                حفظ التغييرات
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تغيير كلمة المرور</CardTitle>
              <CardDescription>أدخل كلمة المرور الحالية والجديدة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">كلمة المرور الحالية</Label>
                <PasswordInput
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <Button onClick={handlePasswordChange} disabled={changingPassword}>
                {changingPassword && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                تغيير كلمة المرور
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
