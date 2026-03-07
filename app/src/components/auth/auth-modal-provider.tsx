/**
 * @file auth-modal-provider.tsx
 * @description Context and provider for global auth modal (Login/Register) on public routes
 * @module components/auth
 */

'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type AuthModalTab = 'register' | 'login'

interface AuthModalContextValue {
  isOpen: boolean
  tab: AuthModalTab
  openAuthModal: (tab?: AuthModalTab) => void
  closeAuthModal: () => void
  setTab: (tab: AuthModalTab) => void
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTabState] = useState<AuthModalTab>('login')

  const openAuthModal = useCallback((t?: AuthModalTab) => {
    if (t !== undefined) setTabState(t)
    setIsOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  const setTab = useCallback((t: AuthModalTab) => {
    setTabState(t)
  }, [])

  const value = useMemo<AuthModalContextValue>(
    () => ({
      isOpen,
      tab,
      openAuthModal,
      closeAuthModal,
      setTab,
    }),
    [isOpen, tab, openAuthModal, closeAuthModal, setTab]
  )

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>
}

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext)
  if (!ctx) {
    throw new Error('useAuthModal must be used within AuthModalProvider')
  }
  return ctx
}

/** Optional hook: returns null when outside AuthModalProvider (e.g. fallback to links). */
export function useAuthModalOptional(): AuthModalContextValue | null {
  return useContext(AuthModalContext)
}
