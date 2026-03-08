'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sparkles, ChevronDown, FileText, Search, Globe, Package } from 'lucide-react'
import { Loader2 } from 'lucide-react'

export type FillScope = 'all' | 'descriptions' | 'seo' | 'specs' | 'translations'

interface SmartFillDropdownProps {
  onFill: (scope: FillScope) => Promise<void>
  disabled?: boolean
  photoGateLocked?: boolean
}

export function SmartFillDropdown({ onFill, disabled, photoGateLocked }: SmartFillDropdownProps) {
  const [loading, setLoading] = useState<FillScope | null>(null)

  const handleFill = async (scope: FillScope) => {
    if (loading) return
    setLoading(scope)
    try {
      await onFill(scope)
    } finally {
      setLoading(null)
    }
  }

  const isDisabled = disabled || photoGateLocked || !!loading

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isDisabled} className="gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          ملء ذكي
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handleFill('all')} disabled={!!loading}>
          <Sparkles className="ms-2 h-4 w-4" />
          ملء جميع الحقول الفارغة
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleFill('descriptions')} disabled={!!loading}>
          <FileText className="ms-2 h-4 w-4" />
          ملء الأوصاف فقط
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleFill('seo')} disabled={!!loading}>
          <Search className="ms-2 h-4 w-4" />
          ملء SEO فقط
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleFill('specs')} disabled={!!loading}>
          <Package className="ms-2 h-4 w-4" />
          ملء المواصفات فقط
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleFill('translations')} disabled={!!loading}>
          <Globe className="ms-2 h-4 w-4" />
          ملء الترجمات فقط
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
