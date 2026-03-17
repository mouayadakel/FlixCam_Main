/**
 * @file auth-modal.tsx
 * @description Global Login/Register modal with tabs, blurred overlay, and role-based redirect.
 * Uses shared LoginForm, RegisterForm, OtpForm from components/auth/forms.
 */

'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useLocale } from '@/hooks/use-locale'
import { useAuthModal } from '@/components/auth/auth-modal-provider'
import { LoginForm, RegisterForm, OtpForm, ForgotPasswordForm } from '@/components/auth/forms'
import { cn } from '@/lib/utils'

export function AuthModal() {
  const router = useRouter()
  const { t, isRtl } = useLocale()
  const { isOpen, tab, closeAuthModal, setTab } = useAuthModal()
  const [otpSentTo, setOtpSentTo] = React.useState<string | null>(null)
  const [pendingRegistrationToken, setPendingRegistrationToken] = React.useState<string | null>(null)

  const handleOpenChange = (open: boolean) => {
    if (!open && tab !== 'otp') closeAuthModal()
  }

  const showLoginRegisterTabs = tab !== 'forgot-password'

  const handleLoginSuccess = () => {
    closeAuthModal()
    router.refresh()
  }

  const handleOtpRequired = ({ registrationToken, phone }: { registrationToken: string; phone: string }) => {
    setPendingRegistrationToken(registrationToken)
    setOtpSentTo(phone)
    setTab('otp')
  }

  const handleOtpSuccess = () => {
    closeAuthModal()
    router.refresh()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName="bg-black/50 backdrop-blur-md"
        className="max-w-[400px] gap-0 rounded-public-card border-border-light bg-white p-8 shadow-modal sm:rounded-lg"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">
          {tab === 'forgot-password'
            ? t('auth.forgotPasswordTitle')
            : tab === 'register'
              ? t('auth.registerTab')
              : t('auth.loginTab')}
        </DialogTitle>
        <div className="flex flex-col gap-5" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="text-center">
            <p className="text-xl font-bold text-brand-primary">FlixCam.rent</p>
          </div>
          {showLoginRegisterTabs && (
            <div className="flex gap-5 border-b border-border-light">
              <button
                type="button"
                onClick={() => setTab('register')}
                className={cn(
                  'pb-2 text-base font-medium uppercase tracking-wide transition-colors',
                  tab === 'register'
                    ? 'border-b-2 border-brand-primary text-text-heading'
                    : 'border-b-2 border-transparent text-text-muted hover:text-text-heading'
                )}
              >
                {t('auth.registerTab')}
              </button>
              <button
                type="button"
                onClick={() => setTab('login')}
                className={cn(
                  'pb-2 text-base font-medium uppercase tracking-wide transition-colors',
                  tab === 'login'
                    ? 'border-b-2 border-brand-primary text-text-heading'
                    : 'border-b-2 border-transparent text-text-muted hover:text-text-heading'
                )}
              >
                {t('auth.loginTab')}
              </button>
            </div>
          )}

          {tab === 'forgot-password' && (
            <>
              <p className="text-center text-base font-medium text-text-heading">
                {t('auth.forgotPasswordTitle')}
              </p>
              <ForgotPasswordForm onBackToLogin={() => setTab('login')} />
            </>
          )}

          {tab === 'login' && (
            <LoginForm
              onSuccess={handleLoginSuccess}
              onSwitchToRegister={() => setTab('register')}
              onForgotPasswordClick={() => setTab('forgot-password')}
            />
          )}

          {tab === 'register' && (
            <RegisterForm
              onOtpRequired={handleOtpRequired}
              onSwitchToLogin={() => setTab('login')}
            />
          )}

          {tab === 'otp' && pendingRegistrationToken && otpSentTo && (
            <OtpForm
              registrationToken={pendingRegistrationToken}
              phone={otpSentTo}
              onSuccess={handleOtpSuccess}
              onBack={() => setTab('register')}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
