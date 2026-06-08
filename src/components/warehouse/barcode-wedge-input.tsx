'use client'

import { useEffect, useRef } from 'react'

interface BarcodeWedgeInputProps {
  enabled?: boolean
  onScan: (code: string) => void | Promise<void>
  placeholder?: string
}

/** Captures USB barcode-scanner keyboard wedge input (Enter-terminated). */
export function BarcodeWedgeInput({
  enabled = true,
  onScan,
  placeholder = 'امسح الباركود أو أدخل SKU…',
}: BarcodeWedgeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const bufferRef = useRef('')

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        const code = bufferRef.current.trim()
        bufferRef.current = ''
        if (code) {
          event.preventDefault()
          void onScan(code)
        }
        return
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        bufferRef.current += event.key
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, onScan])

  return (
    <input
      ref={inputRef}
      type="text"
      autoComplete="off"
      aria-label="Barcode scanner input"
      placeholder={placeholder}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-mono"
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          const code = event.currentTarget.value.trim()
          event.currentTarget.value = ''
          if (code) void onScan(code)
        }
      }}
    />
  )
}
