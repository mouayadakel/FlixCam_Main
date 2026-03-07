/**
 * @file mobile-nav.tsx
 * @description Mobile navigation menu button for admin dashboard
 * @module components/layouts
 */

'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'

export function MobileNav() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Listen for sidebar state changes
    const handleSidebarToggle = () => {
      setSidebarOpen((prev) => !prev)
    }

    // Dispatch event to toggle sidebar
    const toggleSidebar = () => {
      window.dispatchEvent(new CustomEvent('toggle-sidebar'))
    }

    // Store toggle function globally for header button
    ;(window as any).toggleSidebar = toggleSidebar

    return () => {
      delete (window as any).toggleSidebar
    }
  }, [])

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-11 w-11 lg:hidden"
      onClick={() => {
        window.dispatchEvent(new CustomEvent('toggle-sidebar'))
      }}
      aria-label="فتح القائمة"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}
