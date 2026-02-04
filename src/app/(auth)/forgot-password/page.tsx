/**
 * @file page.tsx
 * @description Forgot password page
 * @module app/(auth)/forgot-password
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validators/auth.validator'
import { Loader2, ArrowRight } from 'lucide-react'

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)

    try {
      // TODO: Implement password reset API call
      // For now, simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: 'تم إرسال رابط إعادة التعيين',
        description: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
      })
      setIsSubmitted(true)
    } catch (error) {
      console.error('Forgot password error:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إرسال رابط إعادة التعيين. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50" dir="rtl">
        <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
              <svg
                className="h-8 w-8 text-success-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">تم إرسال الرابط</h1>
            <p className="mt-2 text-sm text-neutral-600">
              تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.
              يرجى التحقق من صندوق الوارد واتباع التعليمات.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/login">العودة إلى تسجيل الدخول</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50" dir="rtl">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-primary-600">نسيت كلمة المرور؟</h1>
          <p className="mt-2 text-sm text-neutral-600">
            أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="example@email.com"
              disabled={isLoading}
              className={errors.email ? 'border-error-500 focus-visible:ring-error-500' : ''}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-error-500" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                إرسال رابط إعادة التعيين
                <ArrowRight className="mr-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="text-center text-sm">
          <Link
            href="/login"
            className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            العودة إلى تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  )
}
