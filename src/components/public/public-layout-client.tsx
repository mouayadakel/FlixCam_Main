/**
 * @file public-layout-client.tsx
 * @description Client wrapper for public layout: AuthModalProvider + AuthModal
 * @module components/public
 */

'use client'

import type { ReactNode } from 'react'
import { AuthModalProvider } from '@/components/auth/auth-modal-provider'
import { AuthModal } from '@/components/auth/auth-modal'
import { PublicHeader } from '@/components/public/public-header'
import { PublicFooter } from '@/components/public/public-footer'
import { WhatsAppCta } from '@/components/public/whatsapp-cta'

export function PublicLayoutClient({ children }: { children: ReactNode }) {
  return (
    <AuthModalProvider>
      <PublicHeader />
      <main
        id="main-content"
        className="min-h-[calc(100vh-theme(spacing.14)-1px)] flex flex-col"
      >
        {children}
      </main>
      <PublicFooter />
      <WhatsAppCta />
      <AuthModal />
    </AuthModalProvider>
  )
}
